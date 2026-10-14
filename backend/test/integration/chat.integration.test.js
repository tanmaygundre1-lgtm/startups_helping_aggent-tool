const test = require('node:test');
const assert = require('node:assert/strict');

const ChatMessage = require('../../models/ChatMessage');
const Team = require('../../models/Team');
const User = require('../../models/User');
const teamRoutes = require('../../routes/teamRoutes');
const { getTeamMessages, sendTeamMessage } = require('../../controllers/chatController');

const founderId = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';
const nonMemberId = '507f1f77bcf86cd799439013';
const teamId = '507f1f77bcf86cd799439014';

const createMockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const createLeanQuery = (value) => ({
  select() {
    return this;
  },
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  skip() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => value,
});

const replaceModelMethods = (replacements) => {
  const originals = {};
  Object.entries(replacements).forEach(([modelName, methods]) => {
    originals[modelName] = {};
    Object.entries(methods).forEach(([methodName, implementation]) => {
      originals[modelName][methodName] = modelName === 'Team'
        ? Team[methodName]
        : modelName === 'User'
          ? User[methodName]
          : ChatMessage[methodName];
      const model = modelName === 'Team' ? Team : modelName === 'User' ? User : ChatMessage;
      model[methodName] = implementation;
    });
  });
  return () => {
    Object.entries(originals).forEach(([modelName, methods]) => {
      const model = modelName === 'Team' ? Team : modelName === 'User' ? User : ChatMessage;
      Object.entries(methods).forEach(([methodName, implementation]) => {
        model[methodName] = implementation;
      });
    });
  };
};

test('chat message model exposes sender, team, content, and chronological index', () => {
  assert.equal(ChatMessage.schema.path('teamId').options.ref, 'Team');
  assert.equal(ChatMessage.schema.path('senderId').options.ref, 'User');
  assert.equal(ChatMessage.schema.path('content').options.maxlength, 2000);
  assert.ok(ChatMessage.schema.indexes().some(([fields]) => (
    fields.teamId === 1 && fields.createdAt === 1 && fields._id === 1
  )));
});

test('team router exposes protected message read and send endpoints', () => {
  const routePaths = teamRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${layer.route.methods.get ? 'GET' : 'POST'} ${layer.route.path}`);

  assert.ok(routePaths.includes('GET /:teamId/messages'));
  assert.ok(routePaths.includes('POST /:teamId/messages'));
  assert.equal(teamRoutes.stack[0].name, 'authenticateUser');
});

test('member can send a message and the authenticated profile becomes the sender', async () => {
  let createdDocument;
  const restore = replaceModelMethods({
    User: { findOne: () => createLeanQuery({ _id: memberId }) },
    Team: { findById: () => createLeanQuery({ _id: teamId, founderId, members: [{ userId: memberId }] }) },
    ChatMessage: {
      create: async (document) => {
        createdDocument = document;
        return { _id: '507f1f77bcf86cd799439015' };
      },
      findById: () => createLeanQuery({
        _id: '507f1f77bcf86cd799439015',
        teamId,
        senderId: { _id: memberId, name: 'Member' },
        content: 'Hello team',
      }),
    },
  });

  try {
    const res = createMockRes();
    await sendTeamMessage({
      user: { uid: 'member-firebase' },
      params: { teamId },
      body: { content: '  Hello team  ', senderId: nonMemberId },
    }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(createdDocument.teamId, teamId);
    assert.equal(createdDocument.senderId, memberId);
    assert.equal(createdDocument.content, 'Hello team');
    assert.equal(res.body.message.content, 'Hello team');
  } finally {
    restore();
  }
});

test('non-members cannot read team messages', async () => {
  const restore = replaceModelMethods({
    User: { findOne: () => createLeanQuery({ _id: nonMemberId }) },
    Team: { findById: () => createLeanQuery({ _id: teamId, founderId, members: [{ userId: memberId }] }) },
  });

  try {
    const res = createMockRes();
    await getTeamMessages({
      user: { uid: 'non-member-firebase' },
      params: { teamId },
      query: {},
    }, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'FORBIDDEN');
  } finally {
    restore();
  }
});

test('chat operations return not found when the team does not exist', async () => {
  const restore = replaceModelMethods({
    User: { findOne: () => createLeanQuery({ _id: memberId }) },
    Team: { findById: () => createLeanQuery(null) },
  });

  try {
    const res = createMockRes();
    await getTeamMessages({
      user: { uid: 'member-firebase' },
      params: { teamId },
      query: {},
    }, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 'TEAM_NOT_FOUND');
  } finally {
    restore();
  }
});

test('invalid team IDs and message content are rejected before database access', async () => {
  const resForInvalidId = createMockRes();
  await sendTeamMessage({ params: { teamId: 'invalid-id' }, body: { content: 'Hello' } }, resForInvalidId);
  assert.equal(resForInvalidId.statusCode, 400);
  assert.equal(resForInvalidId.body.code, 'INVALID_ID');

  const resForInvalidContent = createMockRes();
  await sendTeamMessage({ params: { teamId }, body: { content: '   ' } }, resForInvalidContent);
  assert.equal(resForInvalidContent.statusCode, 400);
  assert.equal(resForInvalidContent.body.code, 'INVALID_MESSAGE_CONTENT');
});

test('team messages use descending database pagination but return each page chronologically', async () => {
  let queryFilter;
  let querySkip;
  let queryLimit;
  let querySort;
  const databaseMessages = [
    { _id: 'message-3', content: 'Third' },
    { _id: 'message-2', content: 'Second' },
  ];
  const restore = replaceModelMethods({
    User: { findOne: () => createLeanQuery({ _id: memberId }) },
    Team: { findById: () => createLeanQuery({ _id: teamId, founderId, members: [{ userId: memberId }] }) },
    ChatMessage: {
      find: (filter) => {
        queryFilter = filter;
        return {
          sort(value) {
            querySort = value;
            return this;
          },
          skip(value) {
            querySkip = value;
            return this;
          },
          limit(value) {
            queryLimit = value;
            return this;
          },
          populate() {
            return this;
          },
          lean: async () => databaseMessages,
        };
      },
      countDocuments: async () => 5,
    },
  });

  try {
    const res = createMockRes();
    await getTeamMessages({
      user: { uid: 'member-firebase' },
      params: { teamId },
      query: { page: '2', limit: '2' },
    }, res);

    assert.deepEqual(queryFilter, { teamId });
    assert.deepEqual(querySort, { createdAt: -1, _id: -1 });
    assert.equal(querySkip, 2);
    assert.equal(queryLimit, 2);
    assert.deepEqual(res.body.messages.map((message) => message.content), ['Second', 'Third']);
    assert.deepEqual(res.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 });
  } finally {
    restore();
  }
});