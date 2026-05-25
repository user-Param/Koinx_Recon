import { Parser } from 'json2csv';
import { Transaction } from '../db/schemas/Transaction.js';
import { ReconciliationRun } from '../db/schemas/ReconciliationRun.js';
import { ReconciledTransaction } from '../db/schemas/ReconciledTransaction.js';
import fs from 'node:fs';
import path from 'node:path';

function flattenTx(tx: any) {
  if (!tx) return {};
  const { _id, runId, __v, ...data } = tx.toObject ? tx.toObject() : tx;
  return data;
}

export async function generateReport(runId: string) {
  const run = await ReconciliationRun.findById(runId);
  if (!run) throw new Error('Run not found');

  const reconciled = await ReconciledTransaction.find({ runId }).populate('userTxId exchangeTxId');
  const allUserTxs = await Transaction.find({ runId, source: 'USER' });
  const allExchangeTxs = await Transaction.find({ runId, source: 'EXCHANGE' });

  const matchedIds = new Set(reconciled.map(r => r.userTxId?._id.toString()));
  const matchedExchangeIds = new Set(reconciled.map(r => r.exchangeTxId?._id.toString()));

  const reportData: any[] = [];

  // 1. Matched and Conflicting
  for (const r of reconciled) {
    const uData = flattenTx(r.userTxId);
    const eData = flattenTx(r.exchangeTxId);

    reportData.push({
      category: r.status === 'MATCHED' ? 'Matched' : 'Conflicting',
      reason: r.reason,
      user_txId: uData.externalId,
      user_timestamp: uData.timestamp,
      user_asset: uData.asset,
      user_quantity: uData.quantity,
      user_type: uData.type,
      exchange_txId: eData.externalId,
      exchange_timestamp: eData.timestamp,
      exchange_asset: eData.asset,
      exchange_quantity: eData.quantity,
      exchange_type: eData.type,
    });
  }

  // 2. Unmatched User
  for (const uTx of allUserTxs) {
    if (!matchedIds.has(uTx._id.toString())) {
      const uData = flattenTx(uTx);
      reportData.push({
        category: 'Unmatched (User only)',
        reason: uTx.status === 'INVALID' ? uTx.invalidReason : 'No matching transaction found in exchange file',
        user_txId: uData.externalId,
        user_timestamp: uData.timestamp,
        user_asset: uData.asset,
        user_quantity: uData.quantity,
        user_type: uData.type,
        exchange_txId: 'N/A',
        exchange_timestamp: 'N/A',
        exchange_asset: 'N/A',
        exchange_quantity: 'N/A',
        exchange_type: 'N/A',
      });
    }
  }

  // 3. Unmatched Exchange
  for (const eTx of allExchangeTxs) {
    if (!matchedExchangeIds.has(eTx._id.toString())) {
      const eData = flattenTx(eTx);
      reportData.push({
        category: 'Unmatched (Exchange only)',
        reason: eTx.status === 'INVALID' ? eTx.invalidReason : 'No matching transaction found in user file',
        user_txId: 'N/A',
        user_timestamp: 'N/A',
        user_asset: 'N/A',
        user_quantity: 'N/A',
        user_type: 'N/A',
        exchange_txId: eData.externalId,
        exchange_timestamp: eData.timestamp,
        exchange_asset: eData.asset,
        exchange_quantity: eData.quantity,
        exchange_type: eData.type,
      });
    }
  }

  const parser = new Parser();
  const csv = parser.parse(reportData);

  const reportPath = path.join('data', `report_${runId}.csv`);
  fs.writeFileSync(reportPath, csv);

  return reportPath;
}
