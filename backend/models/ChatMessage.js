const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    clientMessageId: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

chatMessageSchema.index({ teamId: 1, createdAt: 1, _id: 1 });
chatMessageSchema.index(
  { teamId: 1, senderId: 1, clientMessageId: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);