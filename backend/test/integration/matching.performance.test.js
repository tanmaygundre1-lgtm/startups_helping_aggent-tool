const test = require('node:test');
const assert = require('node:assert/strict');
const Match = require('../../models/Match');

const performanceReady = Boolean(process.env.MONGODB_TEST_URI);

test('matching ranking index is declared for explain verification', { skip: performanceReady ? false : 'Set MONGODB_TEST_URI to run MongoDB explain/index verification.' }, () => {
  const indexes = Match.schema.indexes();
  const rankedIndex = indexes.find(([fields]) => fields.ideaId === 1 && fields.matchScore === -1 && fields.createdAt === -1);
  assert.ok(rankedIndex, 'ranked match index must be declared');
});
