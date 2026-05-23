import mongoose from 'mongoose';

const ReconciledTransactionSchema = new mongoose.Schema({
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReconciliationRun',
    required: true,
  },
  userTxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  exchangeTxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  status: {
    type: String,
    enum: ['MATCHED', 'CONFLICTING'],
  },
  reason: {
    type: String,
  },
});

export const ReconciledTransaction = mongoose.model('ReconciledTransaction', ReconciledTransactionSchema);
