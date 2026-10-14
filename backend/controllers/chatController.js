const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const Team = require('../models/Team');
const User = require('../models/User');

const MAX_MESSAGE_LENGTH = 2000;

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const getAuthenticatedUser = async (req) => User.findOne({ firebaseUid: req.user.uid }).lean();

const getTeamAccess = async (teamId, userId) => {
  const team = await Team.findById(teamId).select('_id founderId members').lean();

  if (!team) return { team: null, authorized: false };

  const isAuthorized = String(team.founderId) === String(userId)
    || team.members.some((member) => String(member.userId) === String(userId));

  return { team, authorized: isAuthorized };
};

const validateTeamId = (teamId, res) => {
  if (!isValidId(teamId)) {
    res.status(400).json({ success: false, message: 'Invalid team ID format', code: 'INVALID_ID' });
    return false;
  }
  return true;
};

const getTeamMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!validateTeamId(teamId, res)) return;

    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '50', 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'page must be at least 1 and limit must be between 1 and 100',
        code: 'INVALID_PAGINATION',
      });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User profile not found', code: 'USER_NOT_FOUND' });
    }

    const access = await getTeamAccess(teamId, user._id);
    if (!access.team) {
      return res.status(404).json({ success: false, message: 'Team not found', code: 'TEAM_NOT_FOUND' });
    }
    if (!access.authorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this team chat', code: 'FORBIDDEN' });
    }

    const filter = { teamId };
    const [messages, total] = await Promise.all([
      ChatMessage.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('senderId', 'name profileImage')
        .lean(),
      ChatMessage.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[ERROR] GET /teams/:teamId/messages:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch team messages', code: 'CHAT_READ_FAILED' });
  }
};

const sendTeamMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!validateTeamId(teamId, res)) return;

    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message content must be between 1 and ${MAX_MESSAGE_LENGTH} characters`,
        code: 'INVALID_MESSAGE_CONTENT',
      });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User profile not found', code: 'USER_NOT_FOUND' });
    }

    const access = await getTeamAccess(teamId, user._id);
    if (!access.team) {
      return res.status(404).json({ success: false, message: 'Team not found', code: 'TEAM_NOT_FOUND' });
    }
    if (!access.authorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this team chat', code: 'FORBIDDEN' });
    }

    const chatMessage = await ChatMessage.create({
      teamId,
      senderId: user._id,
      content,
    });

    const responseMessage = await ChatMessage.findById(chatMessage._id)
      .populate('senderId', 'name profileImage')
      .lean();

    return res.status(201).json({ success: true, message: responseMessage });
  } catch (error) {
    console.error('[ERROR] POST /teams/:teamId/messages:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to send team message', code: 'CHAT_SEND_FAILED' });
  }
};

module.exports = { getTeamMessages, sendTeamMessage };