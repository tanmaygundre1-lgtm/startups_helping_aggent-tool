const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    collegeId: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    profileType: {
      type: String,
      enum: ['founder', 'candidate'],
      default: 'candidate',
    },
    foundedBefore: { type: Boolean, default: false },
    companyStage: { type: String, enum: ['idea', 'early', 'growth', ''], default: '' },
    yearsExperience: { type: Number, min: 0 },
    college: collegeSchema,
    location: locationSchema,
    skills: {
      type: [skillSchema],
      default: [],
    },
    interests: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },

    // Founder-specific fields
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    expertiseAreas: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    lookingFor: {
      type: [{ type: String, trim: true }],
      default: [],
    },

    // Candidate-specific fields
    targetRoles: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    experience: { type: Number, min: 0 },
    qualifications: { type: [{ type: String, trim: true }], default: [] },
    domainInterests: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'flexible', ''],
      default: '',
    },
    hoursPerWeek: {
      type: Number,
      min: 0,
      max: 80,
    },
    workPreference: {
      type: String,
      enum: ['remote', 'in-person', 'hybrid', ''],
      default: '',
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
userSchema.index({ profileType: 1 });
userSchema.index({ 'skills.name': 1 });
userSchema.index({ targetRoles: 1 });
userSchema.index({ domainInterests: 1 });

module.exports = mongoose.model('User', userSchema);
