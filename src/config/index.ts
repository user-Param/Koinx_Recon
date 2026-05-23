export const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/recon_engine',
  PORT: process.env.PORT || 3000,
  DEFAULT_TOLERANCES: {
    TIMESTAMP_TOLERANCE_SECONDS: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS || '300'),
    QUANTITY_TOLERANCE_PCT: parseFloat(process.env.QUANTITY_TOLERANCE_PCT || '0.01'),
  },
};
