const test = require('node:test');
const assert = require('node:assert/strict');

const seedData = require('../../scripts/seedData');
const seedCandidates = require('../../scripts/seedCandidates');
const seedCandidatesBySkill = require('../../scripts/seedCandidatesBySkill');

const withEnvironment = async (values, callback) => {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('demo seeds are blocked in production unless explicitly enabled', async () => {
  await withEnvironment({ NODE_ENV: 'production', ALLOW_DEMO_SEED: undefined }, async () => {
    for (const guard of [
      seedData.assertDemoSeedAllowed,
      seedCandidates.assertDemoSeedAllowed,
      seedCandidatesBySkill.assertDemoSeedAllowed,
    ]) {
      assert.throws(guard, /disabled in production/);
    }
  });
});

test('seed idea upsert reuses the legacy record and preserves its identifier', async () => {
  const legacyIdea = { _id: 'legacy-idea-id' };
  const calls = [];
  const ideaModel = {
    findOne() {
      return { sort: async () => legacyIdea };
    },
    findOneAndUpdate(filter, update, options) {
      calls.push({ filter, update, options });
      return Promise.resolve({ _id: legacyIdea._id, ...update.$set });
    },
  };
  const seedIdea = {
    createdBy: 'seed-founder-id',
    seedKey: seedData.SEED_IDEA_KEY,
    title: seedData.SEED_IDEA_TITLE,
  };

  const first = await seedData.upsertSeedIdea(ideaModel, 'seed-founder-id', seedIdea);
  const second = await seedData.upsertSeedIdea(ideaModel, 'seed-founder-id', seedIdea);

  assert.equal(first._id, legacyIdea._id);
  assert.equal(second._id, legacyIdea._id);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].filter, { _id: legacyIdea._id });
  assert.deepEqual(calls[1].filter, { _id: legacyIdea._id });
  assert.equal(calls[0].options.upsert, true);
});

test('seed lookup is scoped to the seed owner and does not delete other prefixed ideas', async () => {
  let lookup;
  const ideaModel = {
    findOne(filter) {
      lookup = filter;
      return { sort: async () => null };
    },
    findOneAndUpdate(filter, update) {
      return Promise.resolve({ _id: 'new-seed-id', ...update.$set });
    },
  };

  await seedData.upsertSeedIdea(ideaModel, 'seed-founder-id', {
    createdBy: 'seed-founder-id',
    seedKey: seedData.SEED_IDEA_KEY,
    title: seedData.SEED_IDEA_TITLE,
  });

  assert.deepEqual(lookup, {
    createdBy: 'seed-founder-id',
    title: seedData.SEED_IDEA_TITLE,
  });
});
