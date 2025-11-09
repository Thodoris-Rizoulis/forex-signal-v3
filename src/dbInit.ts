import pool from "./utils/db";
import { createLogger } from "./utils/logger";

const logger = createLogger("dbInit");

export async function ensureTables() {
  try {
    // First, ensure the enum type exists
    try {
      await pool.query(`CREATE TYPE signal_type_enum AS ENUM ('BUY', 'SELL')`);
    } catch (err: any) {
      // Type might already exist, that's okay
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }

    // Now ensure all tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Currencies" (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true
      );
      CREATE TABLE IF NOT EXISTS "Pairs" (
        id SERIAL PRIMARY KEY,
        currency_id INTEGER REFERENCES "Currencies"(id),
        target_currency VARCHAR(10) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        is_trending BOOLEAN NOT NULL DEFAULT false,
        trend_direction VARCHAR(4) CHECK (trend_direction IN ('UP', 'DOWN')),
        trend_strength NUMERIC(5,2),
        trend_detected_at TIMESTAMPTZ,
        last_trend_check TIMESTAMPTZ,
        UNIQUE(currency_id, target_currency)
      );
      CREATE TABLE IF NOT EXISTS "Strategies" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        required_rates INTEGER NOT NULL DEFAULT 50,
        risk_ratio NUMERIC DEFAULT 2.0,
        risk_pips INTEGER DEFAULT 10,
        max_holding_minutes INTEGER DEFAULT 1440
      );
      CREATE TABLE IF NOT EXISTS "Rates" (
        id SERIAL PRIMARY KEY,
        pair_id INTEGER REFERENCES "Pairs"(id),
        rate NUMERIC NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Opportunities" (
        id SERIAL PRIMARY KEY,
        pair_id INTEGER REFERENCES "Pairs"(id),
        strategy_id INTEGER REFERENCES "Strategies"(id),
        rate_id INTEGER REFERENCES "Rates"(id),
        details TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        evaluation INTEGER CHECK (evaluation IN (0,1)),
        evaluation_at TIMESTAMPTZ,
        entry_rate NUMERIC,
        stop_loss_rate NUMERIC,
        take_profit_rate NUMERIC,
        evaluation_price NUMERIC,
        pnl_amount NUMERIC,
        signal_type signal_type_enum NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "Consolidations" (
        id SERIAL PRIMARY KEY,
        pair_id INTEGER REFERENCES "Pairs"(id) ON DELETE CASCADE,
        trend_direction VARCHAR(4) CHECK (trend_direction IN ('UP', 'DOWN')),
        start_timestamp TIMESTAMPTZ NOT NULL,
        end_timestamp TIMESTAMPTZ,
        resistance_level NUMERIC NOT NULL,
        support_level NUMERIC NOT NULL,
        broken_at TIMESTAMPTZ,
        breakout_direction VARCHAR(4) CHECK (breakout_direction IN ('UP', 'DOWN')),
        is_trend_direction BOOLEAN,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "Consolidations_pair_id_idx" ON "Consolidations"(pair_id);
      CREATE TABLE IF NOT EXISTS "Logs" (
        id SERIAL PRIMARY KEY,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        service VARCHAR(50),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    logger.info("All tables ensured.");
  } catch (err) {
    logger.error({ err }, "Error ensuring tables");
    throw err;
  }
}
