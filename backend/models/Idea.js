const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      trim: true,
    },
    requiredRoles: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    difficulty: {
      type: String,
      trim: true,
    },
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
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    requiredSkills: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    aiAnalysis: aiAnalysisSchema,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Idea', ideaSchema);
