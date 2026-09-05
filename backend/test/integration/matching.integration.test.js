const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../../app');

const integrationReady = Boolean(
  process.env.MONGODB_TEST_URI && process.env.MATCHING_TEST_TOKEN && process.env.MATCHING_TEST_IDEA_ID,
);

test('matching integration environment is explicit', { skip: integrationReady ? false : 'Set MONGODB_TEST_URI, MATCHING_TEST_TOKEN, and MATCHING_TEST_IDEA_ID to run database-backed matching integration tests.' }, async () => {
  assert.equal(typeof app, 'function');
  assert.ok(process.env.MONGODB_TEST_URI);
  assert.ok(process.env.MATCHING_TEST_TOKEN);
  assert.ok(process.env.MATCHING_TEST_IDEA_ID);
});
