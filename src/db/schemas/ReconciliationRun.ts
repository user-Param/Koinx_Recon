import mongoose from 'mongoose';

const ReconciliationRunSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  config: {
    timestampTolerance: { type: Number },
    quantityTolerance: { type: Number },
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  },
  summary: {
    matched: { type: Number, default: 0 },
    conflicting: { type: Number, default: 0 },
    unmatchedUser: { type: Number, default: 0 },
    unmatchedExchange: { type: Number, default: 0 },
  },
  error: {
    type: String,
  },
});

export const ReconciliationRun = mongoose.model('ReconciliationRun', ReconciliationRunSchema);
