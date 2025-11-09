import pool from "../src/utils/db";
import { createLogger } from "../src/utils/logger";

const logger = createLogger("opportunities-migration");

async function runOpportunitiesTableMigration() {
  logger.info(
    "Starting opportunities table migration - adding consolidation_id, dropping rate_id"
  );

  try {
    // Add consolidation_id column
    await pool.query(`
      ALTER TABLE "Opportunities"
      ADD COLUMN IF NOT EXISTS consolidation_id INTEGER REFERENCES "Consolidations"(id) ON DELETE CASCADE;
    `);
    logger.info("Added consolidation_id column to Opportunities table");

    // Create index for the new foreign key
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "Opportunities_consolidation_id_idx" ON "Opportunities"(consolidation_id);
    `);
    logger.info("Created index on consolidation_id");

    // Drop rate_id column (no longer needed since opportunities are linked to consolidations)
    await pool.query(`
      ALTER TABLE "Opportunities"
      DROP COLUMN IF EXISTS rate_id;
    `);
    logger.info("Dropped rate_id column from Opportunities table");
  } catch (error) {
    logger.error({ error }, "Error during opportunities table migration");
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runOpportunitiesTableMigration()
    .then(() => {
      logger.info("Opportunities table migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ error }, "Opportunities table migration failed");
      process.exit(1);
    });
}

export { runOpportunitiesTableMigration };
