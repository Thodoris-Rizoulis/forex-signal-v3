import pool from "../src/utils/db";
import { createLogger } from "../src/utils/logger";

const logger = createLogger("consolidation-migration");

async function runConsolidationTableMigration() {
  logger.info(
    "Starting consolidation table migration - dropping legacy columns"
  );

  try {
    // Drop legacy columns that are no longer needed after ZigZag implementation
    const dropColumnsQuery = `
      ALTER TABLE "Consolidations"
      DROP COLUMN IF EXISTS atr_ratio,
      DROP COLUMN IF EXISTS quality_score,
      DROP COLUMN IF EXISTS rsi_value,
      DROP COLUMN IF EXISTS macd_histogram,
      DROP COLUMN IF EXISTS macd_signal,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS breakout_session,
      DROP COLUMN IF EXISTS breakout_atr,
      DROP COLUMN IF EXISTS breakout_strength,
      DROP COLUMN IF EXISTS momentum_confirmed,
      DROP COLUMN IF EXISTS volume_confirmed,
      DROP COLUMN IF EXISTS details;
    `;

    await pool.query(dropColumnsQuery);
    logger.info(
      "Successfully dropped legacy columns from Consolidations table"
    );

    // Update any remaining consolidations to have proper timestamps
    // Since we're dropping status, all consolidations should have broken_at set
    const updateQuery = `
      UPDATE "Consolidations"
      SET broken_at = COALESCE(broken_at, end_timestamp)
      WHERE broken_at IS NULL;
    `;

    await pool.query(updateQuery);
    logger.info(
      "Updated consolidations to ensure broken_at timestamps are set"
    );
  } catch (error) {
    logger.error({ error }, "Error during consolidation table migration");
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runConsolidationTableMigration()
    .then(() => {
      logger.info("Consolidation table migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, "Consolidation table migration failed");
      process.exit(1);
    });
}

export { runConsolidationTableMigration };
