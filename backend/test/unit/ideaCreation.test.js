const test = require('node:test');
const assert = require('node:assert/strict');

const Idea = require('../../models/Idea');
const User = require('../../models/User');
const { createIdea } = require('../../controllers/ideaController');

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

const createRequest = (uid, key, title = 'Same idea title') => ({
  user: { uid },
  body: {
    title,
    description: 'A sufficiently long description for this idea submission.',
  },
  get(name) {
    return name === 'Idempotency-Key' ? key : undefined;
  },
});

const runCreate = (uid, key, title) => {
  const res = createMockRes();
  return createIdea(createRequest(uid, key, title), res).then(() => res);
};

test('idea creation requires a valid idempotency key', async () => {
  const originalFindOne = User.findOne;
  let lookedUpUser = false;
  User.findOne = async () => {
    lookedUpUser = true;
    return null;
  };

  try {
    const response = await runCreate('founder-uid', 'invalid key');
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, 'IDEMPOTENCY_KEY_REQUIRED');
    assert.equal(lookedUpUser, false);
  } finally {
    User.findOne = originalFindOne;
  }
});

test('reusing an idempotency key returns the original idea without creating another', async () => {
  const originalUserFindOne = User.findOne;
  const originalIdeaFindOne = Idea.findOne;
  const originalIdeaCreate = Idea.create;
  const user = { _id: '507f1f77bcf86cd799439011' };
  const createdIdea = { _id: '507f1f77bcf86cd799439012', createdBy: user._id, title: 'Same idea title' };
  let createCalls = 0;
  let existingIdea = null;

  User.findOne = async () => user;
  Idea.findOne = async () => existingIdea;
  Idea.create = async (document) => {
    createCalls += 1;
    existingIdea = { ...createdIdea, ...document };
    return existingIdea;
  };

  try {
    const first = await runCreate('founder-uid', 'request-1');
    const second = await runCreate('founder-uid', 'request-1');

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.idempotent, true);
    assert.equal(createCalls, 1);
    assert.equal(second.body.idea._id, createdIdea._id);
  } finally {
    User.findOne = originalUserFindOne;
    Idea.findOne = originalIdeaFindOne;
    Idea.create = originalIdeaCreate;
  }
});

test('concurrent requests with one key recover from the unique-key race', async () => {
  const originalUserFindOne = User.findOne;
  const originalIdeaFindOne = Idea.findOne;
  const originalIdeaCreate = Idea.create;
  const user = { _id: '507f1f77bcf86cd799439011' };
  const createdIdea = { _id: '507f1f77bcf86cd799439012', createdBy: user._id };
  let createCalls = 0;
  let existingIdea = null;

  User.findOne = async () => user;
  Idea.findOne = async () => existingIdea;
  Idea.create = async (document) => {
    createCalls += 1;
    if (createCalls === 1) {
      existingIdea = { ...createdIdea, ...document };
      return existingIdea;
    }
    const error = new Error('duplicate key');
    error.code = 11000;
    throw error;
  };

  try {
    const responses = await Promise.all([
      runCreate('founder-uid', 'request-concurrent'),
      runCreate('founder-uid', 'request-concurrent'),
    ]);

    assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 201]);
    assert.equal(createCalls, 2);
    assert.ok(responses.every((response) => response.body.idea._id === createdIdea._id));
  } finally {
    User.findOne = originalUserFindOne;
    Idea.findOne = originalIdeaFindOne;
    Idea.create = originalIdeaCreate;
  }
});

test('different keys allow legitimate same-title ideas and remain owner-scoped', async () => {
  const originalUserFindOne = User.findOne;
  const originalIdeaFindOne = Idea.findOne;
  const originalIdeaCreate = Idea.create;
  const users = {
    'founder-one': { _id: '507f1f77bcf86cd799439011' },
    'founder-two': { _id: '507f1f77bcf86cd799439012' },
  };
  const created = [];

  User.findOne = async ({ firebaseUid }) => users[firebaseUid];
  Idea.findOne = async () => null;
  Idea.create = async (document) => {
    const idea = { _id: `idea-${created.length + 1}`, ...document };
    created.push(idea);
    return idea;
  };

  try {
    const first = await runCreate('founder-one', 'request-one', 'Same idea title');
    const second = await runCreate('founder-one', 'request-two', 'Same idea title');
    const third = await runCreate('founder-two', 'request-one', 'Same idea title');

    assert.equal(first.statusCode, 201);
    assert.equal(second.statusCode, 201);
    assert.equal(third.statusCode, 201);
    assert.equal(created.length, 3);
    assert.deepEqual(created.map((idea) => String(idea.createdBy)), [
      users['founder-one']._id,
      users['founder-one']._id,
      users['founder-two']._id,
    ]);
  } finally {
    User.findOne = originalUserFindOne;
    Idea.findOne = originalIdeaFindOne;
    Idea.create = originalIdeaCreate;
  }
});

test('idea model keeps titles non-unique and exposes the owner-scoped request index', () => {
  const indexes = Idea.schema.indexes();
  const requestIndex = indexes.find(([fields, options]) => options?.name === 'owner_creation_request_unique');

  assert.equal(Idea.schema.path('title').options.unique, undefined);
  assert.ok(requestIndex);
  assert.deepEqual(requestIndex[0], { createdBy: 1, creationRequestId: 1 });
  assert.deepEqual(requestIndex[1].partialFilterExpression, { creationRequestId: { $exists: true } });
});
