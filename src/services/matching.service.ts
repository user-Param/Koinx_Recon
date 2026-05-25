import { Transaction } from '../db/schemas/Transaction.js';
import { ReconciledTransaction } from '../db/schemas/ReconciledTransaction.js';
import { ReconciliationRun } from '../db/schemas/ReconciliationRun.js';
import { normalizeAsset } from '../utils/asset-mapper.js';
import { logger } from '../utils/logger.js';

export async function runMatching(runId: string, config: { timestampTolerance: number; quantityTolerance: number }) {
  const run = await ReconciliationRun.findById(runId);
  if (!run) throw new Error('Reconciliation run not found');

  const userTxs = await Transaction.find({ runId, source: 'USER', status: 'VALID' });
  const exchangeTxs = await Transaction.find({ runId, source: 'EXCHANGE', status: 'VALID' });

  const matchedUserIds = new Set<string>();
  const matchedExchangeIds = new Set<string>();
  const results: any[] = [];

  const typeMap: Record<string, string> = {
    'TRANSFER_IN': 'TRANSFER_OUT',
    'TRANSFER_OUT': 'TRANSFER_IN',
  };

  for (const uTx of userTxs) {
    const uAsset = normalizeAsset(uTx.asset);
    const uType = uTx.type;
    const uTime = uTx.timestamp!.getTime();
    const uQty = uTx.quantity!;

    // Find candidates in exchange
    const candidates = exchangeTxs.filter(eTx => {
      if (matchedExchangeIds.has(eTx._id.toString())) return false;

      const eAsset = normalizeAsset(eTx.asset);
      if (uAsset !== eAsset) return false;

      const eType = eTx.type;
      if (typeMap[uType] !== eType && uType !== eType) return false;

      // For candidacy, we use a wider window (e.g., 1 hour) to detect potential conflicts
      // instead of just the strict tolerance.
      const eTime = eTx.timestamp!.getTime();
      if (Math.abs(uTime - eTime) > 3600 * 1000) return false;

      return true;
    });

    if (candidates.length > 0) {
      // Sort by smallest timestamp difference
      candidates.sort((a, b) => {
        return Math.abs(uTime - a.timestamp!.getTime()) - Math.abs(uTime - b.timestamp!.getTime());
      });

      const bestMatch = candidates[0];
      const eTime = bestMatch.timestamp!.getTime();
      const eQty = bestMatch.quantity!;

      const timeDiff = Math.abs(uTime - eTime);
      const qtyDiffPct = Math.abs(uQty - eQty) / (uQty || 1) * 100;

      const timeOk = timeDiff <= config.timestampTolerance * 1000;
      const qtyOk = qtyDiffPct <= config.quantityTolerance;

      if (timeOk && qtyOk) {
        results.push({
          runId,
          userTxId: uTx._id,
          exchangeTxId: bestMatch._id,
          status: 'MATCHED',
          reason: 'Successfully matched within tolerances',
        });
        matchedUserIds.add(uTx._id.toString());
        matchedExchangeIds.add(bestMatch._id.toString());
      } else {
        let conflictReason = '';
        if (!timeOk && !qtyOk) conflictReason = `Both timestamp (${(timeDiff/1000).toFixed(0)}s) and quantity (${qtyDiffPct.toFixed(4)}%) exceed tolerance`;
        else if (!timeOk) conflictReason = `Timestamp difference (${(timeDiff/1000).toFixed(0)}s) exceeds tolerance`;
        else conflictReason = `Quantity difference (${qtyDiffPct.toFixed(4)}%) exceeds tolerance`;

        results.push({
          runId,
          userTxId: uTx._id,
          exchangeTxId: bestMatch._id,
          status: 'CONFLICTING',
          reason: conflictReason,
        });
        matchedUserIds.add(uTx._id.toString());
        matchedExchangeIds.add(bestMatch._id.toString());
      }
    }
  }

  // Handle unmatched
  const unmatchedUser = userTxs.filter(uTx => !matchedUserIds.has(uTx._id.toString()));
  const unmatchedExchange = exchangeTxs.filter(eTx => !matchedExchangeIds.has(eTx._id.toString()));

  await ReconciledTransaction.insertMany(results);

  return {
    matched: results.filter(r => r.status === 'MATCHED').length,
    conflicting: results.filter(r => r.status === 'CONFLICTING').length,
    unmatchedUser: unmatchedUser.length,
    unmatchedExchange: unmatchedExchange.length,
  };
}
