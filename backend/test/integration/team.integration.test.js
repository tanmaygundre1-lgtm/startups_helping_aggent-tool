const test = require('node:test');
const assert = require('node:assert/strict');

const Team = require('../../models/Team');
const teamRoutes = require('../../routes/teamRoutes');

const hasTeamFixture = Boolean(
  process.env.MONGODB_TEST_URI &&
    process.env.MONGODB_TEST_DATABASE_NAME &&
    process.env.FIREBASE_PROJECT_ID,
);

test('team model exposes the V1 one-team-per-idea contract', () => {
  const ideaIndex = Team.schema.indexes().find(([fields, options]) => fields.ideaId === 1 && options.unique);
  const statusEnum = Team.schema.path('status').enumValues;
  const memberExists = Team.schema.path('members') && Team.schema.path('members').instance === 'Array';

  assert.ok(ideaIndex, 'expected a unique ideaId index');
  assert.deepEqual(statusEnum, ['Active', 'Archived']);
  assert.equal(memberExists, true);
});

test('team router exposes the protected team endpoints', () => {
  const routePaths = teamRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path)
    .sort();

  assert.ok(routePaths.includes('/'), 'expected POST /');
  assert.ok(routePaths.includes('/:teamId'), 'expected GET /:teamId');
  assert.ok(routePaths.includes('/'), 'expected GET /');
});

test('live team integration requires explicit MongoDB and Firebase fixtures', { skip: !hasTeamFixture }, async () => {
  assert.fail('Configure the team fixture harness before enabling live team formation assertions.');
});
