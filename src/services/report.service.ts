import { Parser } from 'json2csv';
import { Transaction } from '../db/schemas/Transaction.js';
import { ReconciliationRun } from '../db/schemas/ReconciliationRun.js';
import { ReconciledTransaction } from '../db/schemas/ReconciledTransaction.js';
import fs from 'node:fs';
import path from 'node:path';

export async function generateReport(runId: string) {
  const run = await ReconciliationRun.findById(runId);
  if (!run) throw new Error('Run not found');

  const reconciled = await ReconciledTransaction.find({ runId }).populate('userTxId exchangeTxId');
  const allUserTxs = await Transaction.find({ runId, source: 'USER' });
  const allExchangeTxs = await Transaction.find({ runId, source: 'EXCHANGE' });

  const matchedIds = new Set(reconciled.map(r => r.userTxId?._id.toString()));
  const matchedExchangeIds = new Set(reconciled.map(r => r.exchangeTxId?._id.toString()));

  const reportData: any[] = [];

  // Matched and Conflicting
  for (const r of reconciled) {
    reportData.push({
      category: r.status === 'MATCHED' ? 'Matched' : 'Conflicting',
      userRow: JSON.stringify(r.userTxId?.toObject()),
      exchangeRow: JSON.stringify(r.exchangeTxId?.toObject()),
      reason: r.reason,
    });
  }

  // Unmatched User
  for (const uTx of allUserTxs) {
    if (!matchedIds.has(uTx._id.toString())) {
      reportData.push({
        category: 'Unmatched (User only)',
        userRow: JSON.stringify(uTx.toObject()),
        exchangeRow: 'N/A',
        reason: 'No matching transaction found in exchange file',
      });
    }
  }

  // Unmatched Exchange
  for (const eTx of allExchangeTxs) {
    if (!matchedExchangeIds.has(eTx._id.toString())) {
      reportData.push({
        category: 'Unmatched (Exchange only)',
        userRow: 'N/A',
        exchangeRow: JSON.stringify(eTx.toObject()),
        reason: 'No matching transaction found in user file',
      });
    }
  }

  const parser = new Parser();
  const csv = parser.parse(reportData);

  const reportPath = path.join('data', `report_${runId}.csv`);
  fs.writeFileSync(reportPath, csv);

  return reportPath;
}
