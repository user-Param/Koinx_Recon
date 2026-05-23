import { ReconciliationRun } from '../db/schemas/ReconciliationRun.js';
import { ReconciledTransaction } from '../db/schemas/ReconciledTransaction.js';
import { Transaction } from '../db/schemas/Transaction.js';
import { ingestCSV } from '../services/ingestion.service.js';
import { runMatching } from '../services/matching.service.js';
import { generateReport } from '../services/report.service.js';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';
import fs from 'node:fs';

export async function handleReconcile(req: Request) {
  try {
    const body = await req.json();
    const userFilePath = body.userFilePath || 'data/user_transactions.csv';
    const exchangeFilePath = body.exchangeFilePath || 'data/exchange_transactions.csv';

    const tolerances = {
      timestampTolerance: body.timestampTolerance || CONFIG.DEFAULT_TOLERANCES.TIMESTAMP_TOLERANCE_SECONDS,
      quantityTolerance: body.quantityTolerance || CONFIG.DEFAULT_TOLERANCES.QUANTITY_TOLERANCE_PCT,
    };

    const run = new ReconciliationRun({
      config: tolerances,
      status: 'PENDING',
    });
    await run.save();

    logger.info({ runId: run._id }, 'Starting reconciliation run');

    await ingestCSV(userFilePath, 'USER', run._id.toString());
    await ingestCSV(exchangeFilePath, 'EXCHANGE', run._id.toString());

    const summary = await runMatching(run._id.toString(), tolerances);

    await ReconciliationRun.findByIdAndUpdate(run._id, {
      summary,
      status: 'COMPLETED',
      endTime: new Date(),
    });

    await generateReport(run._id.toString());

    return new Response(JSON.stringify({ runId: run._id, summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    logger.error({ error }, 'Reconciliation failed');
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetReport(req: Request, runId: string) {
  try {
    const reportPath = await generateReport(runId);
    const file = Bun.file(reportPath);
    return new Response(file, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="report_${runId}.csv"` },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetSummary(req: Request, runId: string) {
  try {
    const run = await ReconciliationRun.findById(runId);
    if (!run) throw new Error('Run not found');
    return new Response(JSON.stringify(run.summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetUnmatched(req: Request, runId: string) {
  try {
    const run = await ReconciliationRun.findById(runId);
    if (!run) throw new Error('Run not found');

    const reconciled = await ReconciledTransaction.find({ runId });
    const matchedUserIds = new Set(reconciled.map(r => r.userTxId?._id.toString()));
    const matchedExchangeIds = new Set(reconciled.map(r => r.exchangeTxId?._id.toString()));

    const userTxs = await Transaction.find({ runId, source: 'USER', status: 'VALID' });
    const exchangeTxs = await Transaction.find({ runId, source: 'EXCHANGE', status: 'VALID' });

    const unmatchedUser = userTxs.filter(tx => !matchedUserIds.has(tx._id.toString()));
    const unmatchedExchange = exchangeTxs.filter(tx => !matchedExchangeIds.has(tx._id.toString()));

    return new Response(JSON.stringify({ unmatchedUser, unmatchedExchange }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
