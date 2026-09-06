const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../../models/User');
const { createProfile, createCandidateProfile } = require('../../controllers/userController');

test('founder onboarding updates an existing synced user instead of returning PROFILE_EXISTS', async () => {
  const originalExists = User.exists;
  const originalFindOne = User.findOne;
  const originalFindOneAndUpdate = User.findOneAndUpdate;

  try {
    User.exists = async () => true;
    User.findOne = async () => ({
      _id: 'user-1',
      firebaseUid: 'firebase-uid',
      profileCompleted: false,
      save: async function save() {
        this.profileCompleted = true;
        return this;
      },
    });
    User.findOneAndUpdate = async (_query, updates) => ({
      _id: 'user-1',
      firebaseUid: 'firebase-uid',
      profileType: 'founder',
      ...updates,
      profileCompleted: true,
    });

    const req = {
      user: { uid: 'firebase-uid', email: 'founder@test.com', name: 'Founder User' },
      body: {
        profileType: 'founder',
        companyStage: 'idea',
        expertiseAreas: ['AI'],
        lookingFor: ['Engineer'],
        yearsExperience: 3,
        bio: 'Building a startup for AI workflows',
      },
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    await createProfile(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.user.profileType, 'founder');
  } finally {
    User.exists = originalExists;
    User.findOne = originalFindOne;
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('candidate onboarding updates an existing synced user instead of returning PROFILE_EXISTS', async () => {
  const originalExists = User.exists;
  const originalFindOne = User.findOne;
  const originalFindOneAndUpdate = User.findOneAndUpdate;

  try {
    User.exists = async () => true;
    User.findOne = async () => ({
      _id: 'user-2',
      firebaseUid: 'candidate-uid',
      profileCompleted: false,
      save: async function save() {
        this.profileCompleted = true;
        return this;
      },
    });
    User.findOneAndUpdate = async (_query, updates) => ({
      _id: 'user-2',
      firebaseUid: 'candidate-uid',
      profileType: 'candidate',
      ...updates,
      profileCompleted: true,
    });

    const req = {
      user: { uid: 'candidate-uid', email: 'candidate@test.com', name: 'Candidate User' },
      body: {
        targetRoles: ['Frontend Engineer'],
        skills: [{ name: 'React', level: 'Intermediate' }],
        availability: 'full-time',
        location: { city: 'Boston', state: 'MA', region: 'US' },
        experience: 2,
        qualifications: ['BSc CS'],
      },
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    await createCandidateProfile(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.user.profileType, 'candidate');
  } finally {
    User.exists = originalExists;
    User.findOne = originalFindOne;
    User.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
