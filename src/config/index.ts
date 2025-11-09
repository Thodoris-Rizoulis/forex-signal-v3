import dotenv from "dotenv";
dotenv.config();

export const config = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "forex_user",
    password: process.env.DB_PASS || "forex_pass",
    database: process.env.DB_NAME || "forex_db",
  },
  api: {
    key: process.env.FASTFOREX_API_KEY,
    fetchInterval: Number(process.env.FETCH_INTERVAL) || 60,
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  services: {
    trendDetectorInterval:
      (Number(process.env.TREND_DETECTOR_INTERVAL) || 300) * 1000, // Convert seconds to ms
    consolidationInterval:
      (Number(process.env.CONSOLIDATION_INTERVAL) || 900) * 1000, // 15 minutes default
  },
  evaluator: {
    bufferHours: Number(process.env.EVALUATOR_BUFFER_HOURS) || 12, // Hours to look ahead for evaluation
    strengthThreshold: Number(process.env.EVALUATOR_STRENGTH_THRESHOLD) || 0.5, // Breakout strength multiplier
  },
  consolidation: {
    // Oscillation-based consolidation settings (optimized for quality)
    lookbackHours: Number(process.env.CONSOLIDATION_LOOKBACK_HOURS) || 48,
    minConsolidationCandles: Number(process.env.MIN_CONSOLIDATION_CANDLES) || 6, // Reduced from 12 to 6 - allow shorter but meaningful consolidations
    maxConsolidationRangePercent:
      Number(process.env.MAX_CONSOLIDATION_RANGE_PERCENT) || 0.5, // Reduced from 0.6% - tighter ranges for better quality
    minConsolidationRangePercent:
      Number(process.env.MIN_CONSOLIDATION_RANGE_PERCENT) || 0.1, // Reduced from 0.15% - enable detection of tight, high-quality consolidations
    maxConsolidationVolatilityPercent:
      Number(process.env.MAX_CONSOLIDATION_VOLATILITY_PERCENT) || 0.6, // Reduced from 0.8% - lower volatility for cleaner consolidations
    minDirectionChanges: Number(process.env.MIN_DIRECTION_CHANGES) || 2, // Reduced from 3 - allow detection of tight, high-quality consolidations
    breakoutConfirmationCandles:
      Number(process.env.CONSOLIDATION_BREAKOUT_CONFIRMATION_CANDLES) || 1,
  },
  trend: {
    emaShortPercent: 0.2, // 20% of candles for short EMA
    emaLongPercent: 0.5, // 50% of candles for long EMA
    adxPeriod: 14, // ADX calculation period
    adxThreshold: 25, // ADX > 25 for trending
    requiredCandles: 120, // Minimum candles required for analysis
  },
};
