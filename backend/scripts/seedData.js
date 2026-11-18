const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dns.setServers(['1.1.1.1', '1.0.0.1']);

const User = require('../models/User');
const Idea = require('../models/Idea');

const SEED_FOUNDER_UID = 'seed-founder-uid';
const SEED_CANDIDATE_UID = 'seed-candidate-uid';
const SEED_IDEA_KEY = 'campus-team-matching-platform';
const SEED_IDEA_TITLE = '[SEED] Campus Team Matching Platform';

const assertDemoSeedAllowed = () => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed data is disabled in production. Set ALLOW_DEMO_SEED=true only for an intentional seed run.');
  }
};

const upsertSeedUser = (firebaseUid, userDocument) =>
  User.findOneAndUpdate(
    { firebaseUid },
    { $set: userDocument },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );

const upsertSeedIdea = async (ideaModel, founderId, seedIdea) => {
  const legacySeedIdea = await ideaModel.findOne({
    createdBy: founderId,
    title: SEED_IDEA_TITLE,
  }).sort({ createdAt: 1 });

  return ideaModel.findOneAndUpdate(
    legacySeedIdea ? { _id: legacySeedIdea._id } : { seedKey: SEED_IDEA_KEY },
    { $set: seedIdea },
    { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
  );
};

const seedData = async () => {
  assertDemoSeedAllowed();

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }
  if (!process.env.MONGODB_DATABASE_NAME) {
    throw new Error('MONGODB_DATABASE_NAME is not configured');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DATABASE_NAME,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const founder = await upsertSeedUser(SEED_FOUNDER_UID, {
    firebaseUid: SEED_FOUNDER_UID,
    email: 'founder@test.com',
    name: 'Sarah Founder',
    profileType: 'founder',
    college: { name: 'Test University' },
    location: { city: 'Pune', state: 'Maharashtra', region: 'West' },
    bio: 'Student founder building an AI team-matching platform for campus startups.',
    expertiseAreas: ['AI', 'Web Development'],
    lookingFor: ['Backend Developer', 'UI/UX Designer'],
    interests: ['EdTech', 'AI'],
    profileCompleted: true,
  });

  const candidate = await upsertSeedUser(SEED_CANDIDATE_UID, {
    firebaseUid: SEED_CANDIDATE_UID,
    email: 'candidate@test.com',
    name: 'Alex Developer',
    profileType: 'candidate',
    college: { name: 'Test University' },
    location: { city: 'Pune', state: 'Maharashtra', region: 'West' },
    skills: [
      { name: 'Node.js', level: 'Advanced' },
      { name: 'React', level: 'Intermediate' },
      { name: 'MongoDB', level: 'Intermediate' },
    ],
    targetRoles: ['Backend Developer', 'Full Stack Developer'],
    domainInterests: ['EdTech', 'AI'],
    availability: 'part-time',
    hoursPerWeek: 15,
    workPreference: 'hybrid',
    interests: ['startups', 'open source'],
    profileCompleted: true,
  });

  const seedIdea = {
    createdBy: founder._id,
    seedKey: SEED_IDEA_KEY,
    title: SEED_IDEA_TITLE,
    description:
      'Help student founders find teammates by analyzing a startup idea, extracting required roles and skills, and matching college students who can join the team.',
    category: 'SaaS',
    domain: 'EdTech',
    problemStatement: 'Students with ideas cannot find the right teammates on campus.',
    targetUsers: 'College student founders',
    requiredSkills: ['React', 'Node.js', 'MongoDB'],
    status: 'analyzed',
    aiAnalysis: {
      rolesAndSkills: [
        {
          role: 'Backend Developer',
          skills: ['Node.js', 'MongoDB', 'REST API'],
          priority: 'must-have',
          count: 1,
          experienceLevel: 'Intermediate',
        },
        {
          role: 'Frontend Developer',
          skills: ['React', 'TailwindCSS'],
          priority: 'must-have',
          count: 1,
          experienceLevel: 'Intermediate',
        },
      ],
      techStack: ['React', 'Node.js', 'MongoDB', 'Firebase'],
      domain: 'EdTech',
      teamSize: 3,
      keyRequirements: ['Authentication', 'Matching algorithm', 'Invitation flow'],
      nextSteps: ['Complete founder profile', 'Analyze idea', 'Invite candidates'],
      analyzedAt: new Date(),
      isEdited: false,
      isApproved: true,
      approvedAt: new Date(),
    },
  };

  const idea = await upsertSeedIdea(Idea, founder._id, seedIdea);

  console.log('Test data seeded successfully');
  console.log('Founder ID:', founder._id.toString());
  console.log('Candidate ID:', candidate._id.toString());
  console.log('Idea ID:', idea._id.toString());

  await mongoose.disconnect();
};

if (require.main === module) {
  seedData().catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  });
}

module.exports = { seedData, assertDemoSeedAllowed, upsertSeedIdea, SEED_IDEA_KEY, SEED_IDEA_TITLE };
