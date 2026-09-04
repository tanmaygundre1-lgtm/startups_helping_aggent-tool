const mongoose = require('mongoose');

const roleRequirementSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, trim: true },
    skills: [{ type: String, trim: true }],
    priority: { type: String, enum: ['must-have', 'nice-to-have'], default: 'must-have' },
    count: { type: Number, default: 1, min: 1 },
    experienceLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
  },
  { _id: false },
);

const ideaSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },
    category: {
      type: String,
      trim: true,
    },
    domain: {
      type: String,
      trim: true,
    },
    problemStatement: {
      type: String,
      trim: true,
    },
    targetUsers: {
      type: String,
      trim: true,
    },
    requiredSkills: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    requiredRoles: { type: [{ type: String, trim: true }], default: [] },
    stage: { type: String, enum: ['concept', 'mvp', 'launched'], default: 'concept' },
    targetMarket: { type: String, trim: true },
    fundingStage: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'analyzing', 'analyzed', 'matching', 'team-forming', 'complete'],
      default: 'draft',
    },
    // AI analysis results stored inline for quick access
    aiAnalysis: {
      rolesAndSkills: [roleRequirementSchema],
      techStack: [{ type: String, trim: true }],
      domain: { type: String, trim: true },
      teamSize: { type: Number },
      keyRequirements: [{ type: String, trim: true }],
      nextSteps: [{ type: String, trim: true }],
      analyzedAt: { type: Date },
      isEdited: { type: Boolean, default: false },
      isApproved: { type: Boolean, default: false },
      approvedAt: { type: Date },
      founderFeedback: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

ideaSchema.index({ status: 1 });
ideaSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);
