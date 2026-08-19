const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    matchedSkills: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    locationMatch: {
      level: {
        type: String,
        enum: ['college', 'city', 'state', 'region'],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

matchSchema.index({ ideaId: 1, userId: 1 }, { unique: true });
matchSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Match', matchSchema);
