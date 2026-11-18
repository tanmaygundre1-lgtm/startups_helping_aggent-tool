const mongoose = require('mongoose');

const importErrorSchema = new mongoose.Schema(
  {
    rowNumber: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const taskImportBatchSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    previewId: { type: String, maxlength: 100 },
    fileName: { type: String, required: true, maxlength: 255 },
    rowCount: { type: Number, required: true, min: 0 },
    createdCount: { type: Number, default: 0, min: 0 },
    skippedCount: { type: Number, default: 0, min: 0 },
    errors: { type: [importErrorSchema], default: [] },
    status: {
      type: String,
      enum: ['COMMITTING', 'COMMITTED', 'UNDONE', 'PARTIAL_UNDO'],
      default: 'COMMITTING',
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

taskImportBatchSchema.index({ teamId: 1, createdAt: -1 });
taskImportBatchSchema.index({ teamId: 1, previewId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TaskImportBatch', taskImportBatchSchema);
