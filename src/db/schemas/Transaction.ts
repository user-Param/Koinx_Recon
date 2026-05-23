import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['USER', 'EXCHANGE'],
    required: true,
  },
  externalId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
  },
  asset: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
  },
  type: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['VALID', 'INVALID'],
    required: true,
  },
  invalidReason: {
    type: String,
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReconciliationRun',
  },
});

export const Transaction = mongoose.model('Transaction', TransactionSchema);
