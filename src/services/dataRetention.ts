import pool from "../utils/db";
import { createLogger } from "../utils/logger";

const logger = createLogger("dataRetention");

// Retention period: keep data for last 30 days only
const RETENTION_DAYS = 30;
// Retention period for logs: keep for last 3 days only
const LOG_RETENTION_DAYS = 3;
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

async function cleanupOldLogs() {
  const logger = createLogger("dataRetention");
  logger.info("Starting logs retention cleanup process");

  try {
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

    logger.info(`Cleaning up logs older than ${cutoffDate.toISOString()}`);

    // Delete old logs
    const deleteQuery = `
      DELETE FROM "Logs"
      WHERE timestamp < $1
    `;

    const result = await pool.query(deleteQuery, [cutoffDate]);

    logger.info(
      `Logs retention cleanup completed: ${result.rowCount} old log records deleted`
    );
  } catch (error) {
    logger.error({ error }, "Error during logs retention cleanup");
  }
}

export async function runDataRetention() {
  logger.info("Starting data retention service (runs daily)");

  // Run initial cleanup on startup
  await cleanupOldRates();
  await cleanupOldLogs();

  // Set up daily cleanup interval
  setInterval(async () => {
    try {
      await cleanupOldRates();
      await cleanupOldLogs();
    } catch (error) {
      logger.error({ error }, "Error in data retention cleanup loop");
    }
  }, CLEANUP_INTERVAL);
}

// If run directly, start the retention service
if (require.main === module) {
  runDataRetention();
}
