import fs from 'node:fs';
import csv from 'csv-parser';
import { Transaction } from '../db/schemas/Transaction.js';
import { logger } from '../utils/logger.js';

export async function ingestCSV(filePath: string, source: 'USER' | 'EXCHANGE', runId: string) {
  const transactions: any[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        transactions.push(row);
      })
      .on('end', async () => {
        try {
          const processed = transactions.map(row => {
            const { timestamp, quantity, asset, type, transaction_id } = row;
            const txId = transaction_id;

            const parsedDate = new Date(timestamp);
            const parsedQty = parseFloat(quantity);

            let isValid = true;
            let reason = '';

            if (!txId || !asset || !type) {
              isValid = false;
              reason = 'Missing required fields (txId, asset, or type)';
            } else if (isNaN(parsedDate.getTime())) {
              isValid = false;
              reason = `Invalid timestamp: ${timestamp}`;
            } else if (isNaN(parsedQty)) {
              isValid = false;
              reason = `Invalid quantity: ${quantity}`;
            }

            return {
              source,
              externalId: txId || 'UNKNOWN',
              timestamp: isValid ? parsedDate : undefined,
              asset: asset || 'UNKNOWN',
              quantity: isValid ? parsedQty : undefined,
              type: type || 'UNKNOWN',
              status: isValid ? 'VALID' : 'INVALID',
              invalidReason: reason,
              runId,
            };
          });

          await Transaction.insertMany(processed);
          logger.info({ source, count: processed.length }, `Successfully ingested ${filePath}`);
          resolve(processed.length);
        } catch (error) {
          logger.error({ error }, 'Error during ingestion');
          reject(error);
        }
      })
      .on('error', (error) => {
        logger.error({ error }, 'CSV stream error');
        reject(error);
      });
  });
}
