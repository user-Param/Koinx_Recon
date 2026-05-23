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
      GET: (req, { params }) => handleGetReport(req, params.runId),
    },
    '/report/:runId/summary': {
      GET: (req, { params }) => handleGetSummary(req, params.runId),
    },
    '/report/:runId/unmatched': {
      GET: (req, { params }) => handleGetUnmatched(req, params.runId),
    },
  },
});

logger.info(`Server running on port ${server.port}`);
