import { Pool } from "pg";
import { getCandlesInDateRange } from "../src/utils/candleUtils";
import {
  findMajorSignificantLevels,
  findAlternativeSignificantLevels,
  findPriceTrapsBetweenLevels,
} from "../src/utils/technicalIndicators";
import { Pair } from "../src/models/Pair";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

async function debugConsolidation(consolidationId: number) {
  console.log(`🔍 Debugging Consolidation Detection for ${consolidationId}`);
  console.log("=============================================\n");

  try {
    // Get consolidation details
    const consResult = await pool.query(
      'SELECT c.*, curr.code as currency_code, p.target_currency FROM "Consolidations" c ' +
        'JOIN "Pairs" p ON c.pair_id = p.id ' +
        'JOIN "Currencies" curr ON p.currency_id = curr.id ' +
        "WHERE c.id = $1",
      [consolidationId]
    );

    if (consResult.rows.length === 0) {
      console.log(`❌ Consolidation ${consolidationId} not found!`);
      return;
    }

    const cons = consResult.rows[0];
    const pair = await Pair.getById(cons.pair_id);
    if (!pair) {
      console.log("❌ Pair not found!");
      return;
    }

    console.log(`Consolidation: ${cons.currency_code}/${cons.target_currency}`);
    console.log(
      `Detected Range: ${cons.support_level} - ${cons.resistance_level}`
    );
    console.log(`Breakout: ${cons.breakout_direction} at ${cons.broken_at}\n`);

    // Get the candles that were analyzed (48 hours like the service)
    const actualToDate = new Date(cons.end_timestamp);
    const actualFromDate = new Date(
      actualToDate.getTime() - 48 * 60 * 60 * 1000
    );
    const recentCandles = await getCandlesInDateRange(
      pair,
      actualFromDate,
      actualToDate,
      1
    );

    console.log(
      `Analyzed ${
        recentCandles.length
      } candles from ${actualFromDate.toISOString()} to ${actualToDate.toISOString()}\n`
    );

    // Get extended data
    const extendedStart = new Date(cons.start_timestamp);
    extendedStart.setDate(extendedStart.getDate() - 30);
    const extendedCandles = await getCandlesInDateRange(
      pair,
      extendedStart,
      actualToDate,
      1
    );

    // Find levels (same as service)
    let significantLevels = findMajorSignificantLevels(extendedCandles, 5, 8);
    if (!significantLevels || significantLevels.length < 2) {
      significantLevels = findAlternativeSignificantLevels(extendedCandles);
    }

    console.log(`Found ${significantLevels?.length || 0} significant levels\n`);

    // Find traps
    const traps = findPriceTrapsBetweenLevels(
      recentCandles,
      significantLevels,
      3,
      6
    );

    // Find the trap that matches the consolidation
    const matchingTrap = traps.find(
      (trap) =>
        Math.abs(trap.lowerLevel - cons.support_level) < 0.0001 &&
        Math.abs(trap.upperLevel - cons.resistance_level) < 0.0001
    );

    if (matchingTrap) {
      console.log("🎯 Matching Trap Details:");
      console.log(
        `   Levels: ${matchingTrap.lowerLevel.toFixed(
          4
        )} - ${matchingTrap.upperLevel.toFixed(4)}`
      );
      console.log(`   Duration: ${matchingTrap.trapDuration} candles`);
      console.log(
        `   Trap indices: ${matchingTrap.trapStartIndex} to ${matchingTrap.trapEndIndex}`
      );
      console.log(
        `   Breakout: ${matchingTrap.breakoutDirection} (${(
          matchingTrap.breakoutStrength * 100
        ).toFixed(4)}%)`
      );
      console.log(`   Quality: ${matchingTrap.trapQuality.toFixed(2)}`);

      // Check criteria
      const breakoutStrengthPercent = matchingTrap.breakoutStrength * 100;
      const trapDurationPercent =
        (matchingTrap.trapDuration / recentCandles.length) * 100;
      const trapRangePercent =
        ((matchingTrap.upperLevel - matchingTrap.lowerLevel) /
          matchingTrap.lowerLevel) *
        100;

      const hasStrongBreakout = breakoutStrengthPercent >= 0.1;
      const hasReasonableDuration = trapDurationPercent <= 70;
      const hasReasonableRange = trapRangePercent <= 2.0;

      console.log(
        `\nMeets Criteria: ${
          hasStrongBreakout && hasReasonableDuration && hasReasonableRange
            ? "✅"
            : "❌"
        }`
      );
      console.log(
        `- Breakout >= 0.1%: ${
          hasStrongBreakout ? "✅" : "❌"
        } (${breakoutStrengthPercent.toFixed(4)}%)`
      );
      console.log(
        `- Duration <= 70%: ${
          hasReasonableDuration ? "✅" : "❌"
        } (${trapDurationPercent.toFixed(1)}%)`
      );
      console.log(
        `- Range <= 2.0%: ${
          hasReasonableRange ? "✅" : "❌"
        } (${trapRangePercent.toFixed(2)}%)`
      );
    } else {
      console.log(
        `❌ No matching trap found for consolidation ${consolidationId}`
      );
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

async function cleanupConsolidation(consolidationId: number) {
  try {
    console.log(
      `🧹 Cleaning up consolidation ${consolidationId} and associated opportunity`
    );

    // First, delete the opportunity
    const oppResult = await pool.query(
      'DELETE FROM "Opportunities" WHERE consolidation_id = $1 RETURNING id',
      [consolidationId]
    );

    console.log(`Deleted ${oppResult.rows.length} opportunities`);

    // Then delete the consolidation
    const consResult = await pool.query(
      'DELETE FROM "Consolidations" WHERE id = $1 RETURNING id',
      [consolidationId]
    );

    console.log(`Deleted ${consResult.rows.length} consolidations`);

    console.log("✅ Cleanup completed successfully");
  } catch (err) {
    console.error("❌ Error during cleanup:", err);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage:");
    console.log("  npm run consolidation-tool debug <consolidation_id>");
    console.log("  npm run consolidation-tool cleanup <consolidation_id>");
    console.log("");
    console.log("Examples:");
    console.log("  npm run consolidation-tool debug 757");
    console.log("  npm run consolidation-tool cleanup 758");
    process.exit(1);
  }

  const operation = args[0].toLowerCase();
  const consolidationId = parseInt(args[1]);

  if (isNaN(consolidationId)) {
    console.error("❌ Invalid consolidation ID. Must be a number.");
    process.exit(1);
  }

  try {
    if (operation === "debug") {
      await debugConsolidation(consolidationId);
    } else if (operation === "cleanup") {
      await cleanupConsolidation(consolidationId);
    } else {
      console.error(`❌ Unknown operation: ${operation}`);
      console.log("Valid operations: debug, cleanup");
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
