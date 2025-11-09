import pool from "../utils/db";
import { createLogger } from "../utils/logger";

const logger = createLogger("dataRetention");

// Retention period: keep data for last 30 days only
const RETENTION_DAYS = 30;
// Run cleanup daily (24 hours)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

async function cleanupOldRates() {
  const logger = createLogger("dataRetention");
  logger.info("Starting data retention cleanup process");

  try {
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    logger.info(`Cleaning up rates older than ${cutoffDate.toISOString()}`);

    // Delete old rates
    const deleteQuery = `
      DELETE FROM "Rates"
      WHERE timestamp < $1
    `;

    const result = await pool.query(deleteQuery, [cutoffDate]);

    logger.info(
      `Data retention cleanup completed: ${result.rowCount} old rate records deleted`
    );
  } catch (error) {
    logger.error({ error }, "Error during data retention cleanup");
  }
}

export async function runDataRetention() {
  logger.info("Starting data retention service (runs daily)");

  // Run initial cleanup on startup
  await cleanupOldRates();

  // Set up daily cleanup interval
  setInterval(async () => {
    try {
      await cleanupOldRates();
    } catch (error) {
      logger.error({ error }, "Error in data retention cleanup loop");
    }
  }, CLEANUP_INTERVAL);
}

// If run directly, start the retention service
if (require.main === module) {
  runDataRetention();
}
