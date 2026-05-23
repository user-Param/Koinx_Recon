import mongoose from 'mongoose';
import { CONFIG } from '../config/index.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error({ error }, 'Error connecting to MongoDB');
    process.exit(1);
  }
}
