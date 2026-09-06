const test = require('node:test');
const assert = require('node:assert/strict');
const Invitation = require('../../models/Invitation');
const invitationRoutes = require('../../routes/invitationRoutes');

const hasInvitationFixture = Boolean(
  process.env.INVITATION_TEST_MONGODB_URI && process.env.INVITATION_TEST_FOUNDER_TOKEN,
);

test('invitation model exposes the V1 lifecycle states and unique identity index', () => {
  const statusPath = Invitation.schema.path('status');
  assert.deepEqual(statusPath.enumValues, ['Pending', 'Accepted', 'Declined', 'Withdrawn']);
  assert.ok(Invitation.schema.indexes().some(([fields, options]) => fields.ideaId === 1 && fields.toCandidate === 1 && options.unique));
});

test('invitation router exposes the lifecycle endpoints', () => {
  const routeStack = invitationRoutes.stack || [];
  const paths = routeStack.map((layer) => layer.route?.path).filter(Boolean);
  assert.deepEqual(paths.sort(), ['/', '/', '/:invitationId', '/:invitationId/accept', '/:invitationId/decline', '/:invitationId/withdraw'].sort());
});

test('live invitation lifecycle integration requires explicit Firebase and Mongo fixtures', { skip: !hasInvitationFixture }, async () => {
  assert.fail('Configure the invitation fixture harness before enabling live lifecycle assertions.');
});
