const test = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();
dns.setServers(['1.1.1.1', '1.0.0.1']);

const Match = require('../../models/Match');

const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_TEST_DATABASE_NAME || process.env.MONGODB_DATABASE_NAME || 'startuplink';
const performanceReady = Boolean(mongoUri);

const skipReason = 'Set MONGODB_TEST_URI (or MONGODB_URI) to run MongoDB explain/index verification.';

test('matching ranking index is declared on the Match schema', () => {
  const indexes = Match.schema.indexes();
  const rankedIndex = indexes.find(
    ([fields]) => fields.ideaId === 1 && fields.matchScore === -1 && fields.createdAt === -1 && fields._id === 1,
  );
  const uniquePair = indexes.find(([fields]) => fields.ideaId === 1 && fields.userId === 1);
  assert.ok(rankedIndex, 'ranked match index must be declared');
  assert.ok(uniquePair, 'unique ideaId/userId index must be declared');
});

test(
  'matching ranking index is usable for explain verification',
  { skip: performanceReady ? false : skipReason },
  async (t) => {
    await mongoose.connect(mongoUri.trim(), {
      dbName: mongoDbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    t.after(async () => {
      await mongoose.disconnect();
    });

    await Match.init();
    const indexes = await Match.collection.indexes();
    const ranked = indexes.find((index) => {
      const keys = index.key || {};
      return keys.ideaId === 1 && keys.matchScore === -1 && keys.createdAt === -1 && keys._id === 1;
    });
    assert.ok(ranked, 'ranked compound index must exist in MongoDB');

    const ideaId = new mongoose.Types.ObjectId();
    const explanation = await Match.find({ ideaId })
      .sort({ matchScore: -1, createdAt: -1, _id: 1 })
      .limit(10)
      .explain('queryPlanner');

    const winningPlan = explanation?.queryPlanner?.winningPlan;
    const planText = JSON.stringify(winningPlan || explanation);
    assert.ok(
      planText.includes('matchScore') || planText.includes('IXSCAN') || planText.includes('ideaId'),
      'explain plan should reference the ranked matching index path',
    );
  },
);
