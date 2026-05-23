import { connectDB } from '../db/connection.js';
import { handleReconcile, handleGetReport, handleGetSummary, handleGetUnmatched } from './handlers.js';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

await connectDB();

Bun.serve({
  port: CONFIG.PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'POST' && path === '/reconcile') {
      return handleReconcile(req);
    }

    if (req.method === 'GET' && path.startsWith('/report/')) {
      const parts = path.split('/'); // ["", "report", "runId", "action?"]
      const runId = parts[2];

      if (!runId) {
        return new Response('Run ID missing', { status: 400 });
      }

      const action = parts[3];

      if (action === 'summary') {
        return handleGetSummary(req, runId);
      }
      if (action === 'unmatched') {
        return handleGetUnmatched(req, runId);
      }
      if (!action) {
        return handleGetReport(req, runId);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
}).then(server => {
  logger.info(`Server running on port ${server.port}`);
});
