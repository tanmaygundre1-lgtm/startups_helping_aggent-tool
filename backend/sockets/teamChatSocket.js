const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { getAuth } = require('firebase-admin/auth');
const firebaseAdminApp = require('../config/firebaseAdmin');
const ChatMessage = require('../models/ChatMessage');
const Team = require('../models/Team');
const User = require('../models/User');

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CLIENT_MESSAGE_ID_LENGTH = 100;

const roomName = (teamId) => `team:${teamId}`;
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const acknowledge = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

const getTeamAccess = async (teamId, userId) => {
  const team = await Team.findById(teamId).select('_id founderId members').lean();
  if (!team) return { team: null, authorized: false };

  const authorized = String(team.founderId) === String(userId)
    || team.members.some((member) => String(member.userId) === String(userId));

  return { team, authorized };
};

const getMessageForResponse = (messageId) => ChatMessage.findById(messageId)
  .populate('senderId', 'name profileImage')
  .lean();

const registerTeamChatHandlers = (io, options = {}) => {
  const verifyIdToken = options.verifyIdToken
    || ((token) => getAuth(firebaseAdminApp).verifyIdToken(token));
  const findUserByFirebaseUid = options.findUserByFirebaseUid
    || ((uid) => User.findOne({ firebaseUid: uid }).lean());

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      const error = new Error('Authentication required');
      error.data = { code: 'AUTH_REQUIRED' };
      return next(error);
    }

    try {
      const decodedUser = await verifyIdToken(token);
      const user = await findUserByFirebaseUid(decodedUser.uid);
      if (!user) {
        const error = new Error('User profile not found');
        error.data = { code: 'USER_NOT_FOUND' };
        return next(error);
      }
      socket.user = user;
      socket.firebaseUser = decodedUser;
      return next();
    } catch (error) {
      const authError = new Error('Invalid or expired authentication token');
      authError.data = { code: 'INVALID_TOKEN' };
      return next(authError);
    }
  });

  io.on('connection', (socket) => {
    socket.data.teamRooms = new Set();

    socket.on('team:join', async (payload = {}, ack) => {
      const { teamId } = payload;
      if (!isValidId(teamId)) {
        return acknowledge(ack, { ok: false, code: 'INVALID_ID', message: 'Invalid team ID format' });
      }

      try {
        const access = await getTeamAccess(teamId, socket.user._id);
        if (!access.team) {
          return acknowledge(ack, { ok: false, code: 'TEAM_NOT_FOUND', message: 'Team not found' });
        }
        if (!access.authorized) {
          return acknowledge(ack, { ok: false, code: 'FORBIDDEN', message: 'Not authorized to access this team chat' });
        }

        const room = roomName(teamId);
        await socket.join(room);
        socket.data.teamRooms.add(teamId);
        return acknowledge(ack, { ok: true, teamId });
      } catch (error) {
        console.error('[SOCKET ERROR] team:join:', error.message);
        return acknowledge(ack, { ok: false, code: 'CHAT_JOIN_FAILED', message: 'Unable to join team chat' });
      }
    });

    socket.on('team:leave', async (payload = {}, ack) => {
      const { teamId } = payload;
      if (!isValidId(teamId)) {
        return acknowledge(ack, { ok: false, code: 'INVALID_ID', message: 'Invalid team ID format' });
      }
      await socket.leave(roomName(teamId));
      socket.data.teamRooms.delete(teamId);
      return acknowledge(ack, { ok: true, teamId });
    });

    socket.on('team:message', async (payload = {}, ack) => {
      const { teamId, content, clientMessageId } = payload;
      if (!isValidId(teamId)) {
        return acknowledge(ack, { ok: false, code: 'INVALID_ID', message: 'Invalid team ID format' });
      }

      const trimmedContent = typeof content === 'string' ? content.trim() : '';
      if (!trimmedContent || trimmedContent.length > MAX_MESSAGE_LENGTH) {
        return acknowledge(ack, {
          ok: false,
          code: 'INVALID_MESSAGE_CONTENT',
          message: `Message content must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
        });
      }
      if (typeof clientMessageId !== 'string'
        || !clientMessageId.trim()
        || clientMessageId.length > MAX_CLIENT_MESSAGE_ID_LENGTH) {
        return acknowledge(ack, {
          ok: false,
          code: 'INVALID_CLIENT_MESSAGE_ID',
          message: 'A valid client message ID is required',
        });
      }

      const room = roomName(teamId);
      if (!socket.data.teamRooms.has(teamId) || !socket.rooms.has(room)) {
        return acknowledge(ack, { ok: false, code: 'NOT_JOINED', message: 'Join this team chat before sending messages' });
      }

      try {
        const access = await getTeamAccess(teamId, socket.user._id);
        if (!access.team) {
          return acknowledge(ack, { ok: false, code: 'TEAM_NOT_FOUND', message: 'Team not found' });
        }
        if (!access.authorized) {
          await socket.leave(room);
          socket.data.teamRooms.delete(teamId);
          return acknowledge(ack, { ok: false, code: 'FORBIDDEN', message: 'Not authorized to access this team chat' });
        }

        let chatMessage;
        try {
          chatMessage = await ChatMessage.create({
            teamId,
            senderId: socket.user._id,
            content: trimmedContent,
            clientMessageId: clientMessageId.trim(),
          });
        } catch (error) {
          if (error.code !== 11000) throw error;
          const duplicate = await ChatMessage.findOne({
            teamId,
            senderId: socket.user._id,
            clientMessageId: clientMessageId.trim(),
          });
          if (!duplicate) throw error;
          const duplicateMessage = await getMessageForResponse(duplicate._id);
          return acknowledge(ack, { ok: true, duplicate: true, message: duplicateMessage });
        }

        const responseMessage = await getMessageForResponse(chatMessage._id);
        io.to(room).emit('team:message', responseMessage);
        return acknowledge(ack, { ok: true, message: responseMessage });
      } catch (error) {
        console.error('[SOCKET ERROR] team:message:', error.message);
        return acknowledge(ack, { ok: false, code: 'CHAT_SEND_FAILED', message: 'Failed to save team message' });
      }
    });
  });

  return io;
};

const createTeamChatSocketServer = (httpServer, options = {}) => {
  const configuredOrigin = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN;
  const io = new Server(httpServer, {
    cors: {
      origin: configuredOrigin || true,
      methods: ['GET', 'POST'],
    },
  });
  return registerTeamChatHandlers(io, options);
};

module.exports = { createTeamChatSocketServer, registerTeamChatHandlers, roomName };