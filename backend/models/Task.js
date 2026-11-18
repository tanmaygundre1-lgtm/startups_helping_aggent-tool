const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deadline: { type: Date, default: null },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'SKIPPED', 'BLOCKED'],
      default: 'TODO',
    },
    completionEvidence: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: {
        validator(value) {
          if (!value) return true;
          try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
          } catch {
            return false;
          }
        },
        message: 'Completion evidence must be an HTTP or HTTPS URL',
      },
    },
    evidenceRequired: { type: Boolean, default: false },
    skipReason: { type: String, trim: true, maxlength: 1000, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    skippedAt: { type: Date, default: null },
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskImportBatch',
      default: null,
    },
    importRowNumber: { type: Number, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

taskSchema.index({ teamId: 1, assignedTo: 1, status: 1 });
taskSchema.index({ teamId: 1, deadline: 1 });
taskSchema.index({ importBatchId: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
