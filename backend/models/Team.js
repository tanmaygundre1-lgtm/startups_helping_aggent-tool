const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invitation',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const teamSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      unique: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['Active', 'Archived'],
      default: 'Active',
    },
  },
  { timestamps: true },
);

teamSchema.index({ founderId: 1, status: 1 });
teamSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('Team', teamSchema);
