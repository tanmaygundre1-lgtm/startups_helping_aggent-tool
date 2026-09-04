const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rawAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    extractedRoles: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    extractedSkills: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    techStack: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    teamRequirements: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    founderFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

analysisSchema.index({ ideaId: 1, founderId: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);
