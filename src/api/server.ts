import index from '../frontend/index.html';
import { connectDB } from '../db/connection.js';
import { handleReconcile, handleGetReport, handleGetSummary, handleGetUnmatched } from './handlers.js';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

await connectDB();

const server = Bun.serve({
  port: CONFIG.PORT,
  routes: {
    '/': index,
    '/App.tsx': {
      GET: () => Bun.file('src/frontend/App.tsx'),
    },
    '/reconcile': {
      POST: handleReconcile,
    },
    '/report/:runId': {
      GET: (req) => handleGetReport(req, req.params.runId),
    },
    '/report/:runId/summary': {
      GET: (req) => handleGetSummary(req, req.params.runId),
    },
    '/report/:runId/unmatched': {
      GET: (req) => handleGetUnmatched(req, req.params.runId),
    },
  },
});

logger.info(`Server running on port ${server.port}`);
