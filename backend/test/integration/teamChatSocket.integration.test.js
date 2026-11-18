const test = require('node:test');
const assert = require('node:assert/strict');

const ChatMessage = require('../../models/ChatMessage');
const Team = require('../../models/Team');
const {
  registerTeamChatHandlers,
  roomName,
} = require('../../sockets/teamChatSocket');

const founderId = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';
const nonMemberId = '507f1f77bcf86cd799439013';
const teamId = '507f1f77bcf86cd799439014';

const createQuery = (value) => ({
  select() {
    return this;
  },
  populate() {
    return this;
  },
  lean: async () => value,
});

const createFakeIo = () => {
  const io = {
    middleware: null,
    connectionHandler: null,
    emitted: [],
    sockets: new Set(),
    broadcast(room, event, payload, excludedSocket) {
      this.emitted.push({ room, event, payload });
      this.sockets.forEach((socket) => {
        if (socket !== excludedSocket && socket.rooms.has(room)) {
          socket.received.push({ event, payload });
        }
      });
    },
    use(handler) {
      this.middleware = handler;
    },
    on(event, handler) {
      if (event === 'connection') this.connectionHandler = handler;
    },
    to(room) {
      return {
        emit: (event, payload) => this.broadcast(room, event, payload),
      };
    },
    in(room) {
      return {
        fetchSockets: async () => [...this.sockets].filter((socket) => socket.rooms.has(room)),
      };
    },
  };
  return io;
};

const createFakeSocket = (io, userId, socketId) => {
  const socket = {
    id: socketId,
    user: { _id: userId },
    handshake: { auth: {} },
    rooms: new Set([socketId]),
    data: {},
    handlers: {},
    received: [],
    joined: [],
    left: [],
    on(event, handler) {
      this.handlers[event] = handler;
    },
    to(room) {
      return {
        emit: (event, payload) => io.broadcast(room, event, payload, this),
      };
    },
    async join(room) {
      this.rooms.add(room);
      this.joined.push(room);
    },
    async leave(room) {
      this.rooms.delete(room);
      this.left.push(room);
    },
  };
  io.sockets.add(socket);
  return socket;
};

const setup = ({ team, userId = memberId, create, findById, findOne } = {}) => {
  const io = createFakeIo();
  const restore = {
    teamFindById: Team.findById,
    messageCreate: ChatMessage.create,
    messageFindById: ChatMessage.findById,
    messageFindOne: ChatMessage.findOne,
  };

  Team.findById = () => createQuery(team || {
    _id: teamId,
    founderId,
    members: [{ userId: memberId }],
  });
  let lastCreatedMessage;
  let messageSequence = 0;
  const createMessage = create || (async (document) => ({
    _id: `message-${++messageSequence}`,
    ...document,
  }));
  ChatMessage.create = async (document) => {
    lastCreatedMessage = await createMessage(document);
    return lastCreatedMessage;
  };
  ChatMessage.findById = findById || (() => createQuery({
    ...lastCreatedMessage,
    senderId: { _id: lastCreatedMessage?.senderId || userId, name: 'Team member' },
  }));
  ChatMessage.findOne = findOne || (() => createQuery(null));

  registerTeamChatHandlers(io, {
    verifyIdToken: async (token) => ({ uid: token }),
    findUserByFirebaseUid: async () => ({ _id: userId, firebaseUid: 'member-token' }),
  });
  const connectSocket = (connectedUserId, socketId = `socket-${io.sockets.size + 1}`) => {
    const socket = createFakeSocket(io, connectedUserId, socketId);
    socket.firebaseUser = { uid: `firebase-${connectedUserId}` };
    io.connectionHandler(socket);
    return socket;
  };
  const socket = connectSocket(userId, 'socket-1');

  return {
    io,
    socket,
    connectSocket,
    restoreAll() {
      Team.findById = restore.teamFindById;
      ChatMessage.create = restore.messageCreate;
      ChatMessage.findById = restore.messageFindById;
      ChatMessage.findOne = restore.messageFindOne;
    },
  };
};

test('socket authentication requires and verifies a Firebase ID token', async () => {
  const io = createFakeIo();
  registerTeamChatHandlers(io, {
    verifyIdToken: async (token) => {
      if (token === 'bad-token') throw new Error('invalid');
      return { uid: token };
    },
    findUserByFirebaseUid: async () => ({ _id: memberId }),
  });

  const missingTokenSocket = { handshake: { auth: {}, headers: {} } };
  let missingError;
  await io.middleware(missingTokenSocket, (error) => { missingError = error; });
  assert.equal(missingError.data.code, 'AUTH_REQUIRED');

  const invalidTokenSocket = { handshake: { auth: { token: 'bad-token' }, headers: {} } };
  let invalidError;
  await io.middleware(invalidTokenSocket, (error) => { invalidError = error; });
  assert.equal(invalidError.data.code, 'INVALID_TOKEN');

  const validSocket = { handshake: { auth: { token: 'good-token' }, headers: {} } };
  let nextCalled = false;
  await io.middleware(validSocket, (error) => { nextCalled = !error; });
  assert.equal(nextCalled, true);
  assert.deepEqual(validSocket.user, { _id: memberId });
});

test('authorized team members can join a team room', async () => {
  const context = setup();
  try {
    let response;
    await context.socket.handlers['team:join']({ teamId }, (payload) => { response = payload; });
    assert.deepEqual(response, { ok: true, teamId });
    assert.deepEqual(context.socket.joined, [roomName(teamId)]);
    assert.equal(context.socket.data.teamRooms.has(teamId), true);
  } finally {
    context.restoreAll();
  }
});

test('non-members cannot join a team room or submit messages', async () => {
  const context = setup({
    userId: nonMemberId,
    team: { _id: teamId, founderId, members: [{ userId: memberId }] },
  });
  try {
    let joinResponse;
    await context.socket.handlers['team:join']({ teamId }, (payload) => { joinResponse = payload; });
    assert.equal(joinResponse.code, 'FORBIDDEN');
    assert.equal(joinResponse.message, 'You are not a member of this team yet');
    assert.deepEqual(context.socket.joined, []);

    context.socket.data.teamRooms.add(teamId);
    context.socket.rooms.add(roomName(teamId));
    let messageResponse;
    await context.socket.handlers['team:message'](
      { teamId, content: 'Not allowed', clientMessageId: 'client-1' },
      (payload) => { messageResponse = payload; },
    );
    assert.equal(messageResponse.code, 'FORBIDDEN');
  } finally {
    context.restoreAll();
  }
});

test('founder and candidate receive each other’s team messages in realtime', async () => {
  const context = setup({ userId: founderId });
  try {
    const candidateSocket = context.connectSocket(memberId, 'candidate-socket');
    let founderJoin;
    let candidateJoin;
    await context.socket.handlers['team:join']({ teamId }, (payload) => { founderJoin = payload; });
    await candidateSocket.handlers['team:join']({ teamId }, (payload) => { candidateJoin = payload; });
    assert.equal(founderJoin.ok, true);
    assert.equal(candidateJoin.ok, true);

    await context.socket.handlers['team:message'](
      { teamId, content: 'Founder message', clientMessageId: 'founder-message-1' },
      () => {},
    );
    assert.equal(
      candidateSocket.received.some((entry) => entry.event === 'team:message' && entry.payload.content === 'Founder message'),
      true,
    );

    await candidateSocket.handlers['team:message'](
      { teamId, content: 'Candidate reply', clientMessageId: 'candidate-message-1' },
      () => {},
    );
    assert.equal(
      context.socket.received.some((entry) => entry.event === 'team:message' && entry.payload.content === 'Candidate reply'),
      true,
    );
  } finally {
    context.restoreAll();
  }
});

test('messages are persisted before authorized room delivery', async () => {
  let persisted = false;
  const context = setup({
    create: async (document) => {
      persisted = true;
      return { _id: 'message-1', ...document };
    },
  });
  try {
    await context.socket.handlers['team:join']({ teamId }, () => {});
    let response;
    await context.socket.handlers['team:message'](
      { teamId, content: 'Hello team', clientMessageId: 'client-1' },
      (payload) => { response = payload; },
    );

    assert.equal(persisted, true);
    assert.equal(response.ok, true);
    assert.equal(context.io.emitted.length, 1);
    assert.equal(context.io.emitted[0].room, roomName(teamId));
    assert.equal(context.io.emitted[0].event, 'team:message');
    assert.equal(context.io.emitted[0].payload.content, 'Hello team');
  } finally {
    context.restoreAll();
  }
});

test('duplicate client message IDs acknowledge the saved message without rebroadcasting', async () => {
  const duplicate = { _id: 'message-1' };
  const context = setup({
    findOne: () => createQuery(duplicate),
  });
  ChatMessage.create = async () => {
    const error = new Error('duplicate key');
    error.code = 11000;
    throw error;
  };

  try {
    await context.socket.handlers['team:join']({ teamId }, () => {});
    let response;
    await context.socket.handlers['team:message'](
      { teamId, content: 'Retry', clientMessageId: 'client-1' },
      (payload) => { response = payload; },
    );
    assert.equal(response.duplicate, true);
    assert.equal(context.io.emitted.length, 0);
  } finally {
    context.restoreAll();
  }
});

test('database failures return an error and do not deliver a message', async () => {
  const context = setup({
    create: async () => {
      throw new Error('database unavailable');
    },
  });
  try {
    await context.socket.handlers['team:join']({ teamId }, () => {});
    let response;
    await context.socket.handlers['team:message'](
      { teamId, content: 'Hello', clientMessageId: 'client-1' },
      (payload) => { response = payload; },
    );
    assert.deepEqual(response, { ok: false, code: 'CHAT_SEND_FAILED', message: 'Failed to save team message' });
    assert.equal(context.io.emitted.length, 0);
  } finally {
    context.restoreAll();
  }
});