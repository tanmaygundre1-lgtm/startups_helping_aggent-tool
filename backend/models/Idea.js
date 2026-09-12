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
      enum: ['draft', 'enhancing', 'enhanced', 'analyzing', 'analyzed', 'matching', 'team-forming', 'complete'],
      default: 'draft',
    },
    original: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      capturedAt: { type: Date },
    },
    enhanced: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      problem: { type: String, trim: true },
      solution: { type: String, trim: true },
      targetAudience: { type: String, trim: true },
      valueProposition: { type: String, trim: true },
      coreWorkflow: { type: String, trim: true },
      updatedAt: { type: Date },
    },
    // AI analysis results stored inline for quick access
    aiAnalysis: {
      evidence: { type: mongoose.Schema.Types.Mixed, default: undefined },
      scoring: {
        version: { type: String, trim: true },
        overallScore: { type: Number, min: 0, max: 100 },
        breakdown: {
          problemStrength: { type: Number, min: 0, max: 100 },
          marketPotential: { type: Number, min: 0, max: 100 },
          feasibility: { type: Number, min: 0, max: 100 },
          differentiation: { type: Number, min: 0, max: 100 },
          executionReadiness: { type: Number, min: 0, max: 100 },
        },
        verdict: {
          type: String,
          enum: ['STRONG_POTENTIAL', 'PROMISING', 'NEEDS_REFINEMENT', 'HIGH_RISK'],
        },
      },
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
