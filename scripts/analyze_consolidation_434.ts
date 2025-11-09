import { Consolidation } from "../src/models/Consolidation";
import { Pair } from "../src/models/Pair";
import { getCandlesInDateRange } from "../src/utils/candleUtils";

async function analyzeConsolidation434() {
  console.log("=== PROFESSIONAL TRADER ANALYSIS: CONSOLIDATION 434 ===");

  try {
    // Get consolidation 434
    const consolidation = await Consolidation.getById(434);

    if (!consolidation) {
      console.log("❌ Consolidation 434 not found");
      return;
    }

    // Get the pair information
    const pairs = await Pair.getAll();
    const pair = pairs.find((p) => p.id === consolidation.pairId);

    if (!pair) {
      console.log("❌ Pair not found for consolidation 434");
      return;
    }

    console.log(
      `\n🎯 CONSOLIDATION 434 - ${pair.currencyCode}/${pair.targetCurrency}`
    );
    console.log(
      `📅 Period: ${consolidation.startTimestamp.toISOString()} to ${consolidation.endTimestamp?.toISOString()}`
    );
    console.log(`💰 Support: ${consolidation.supportLevel.toFixed(5)}`);
    console.log(`📈 Resistance: ${consolidation.resistanceLevel.toFixed(5)}`);
    console.log(`🚀 Broken at: ${consolidation.brokenAt?.toISOString()}`);
    console.log(`📊 Breakout Direction: ${consolidation.breakoutDirection}`);
    console.log(`🔄 Trend Direction: ${consolidation.trendDirection}`);
    console.log(`✅ Is Trend Direction: ${consolidation.isTrendDirection}`);

    // Calculate consolidation metrics
    const duration = consolidation.endTimestamp
      ? (consolidation.endTimestamp.getTime() -
          consolidation.startTimestamp.getTime()) /
        (1000 * 60 * 60)
      : 0;
    const range = consolidation.resistanceLevel - consolidation.supportLevel;
    const rangePercent = (range / consolidation.supportLevel) * 100;

    console.log(`\n📊 BASIC METRICS:`);
    console.log(`   Duration: ${duration.toFixed(1)} hours`);
    console.log(`   Range: ${(range * 10000).toFixed(1)} pips`);
    console.log(`   Range %: ${rangePercent.toFixed(2)}%`);

    // Get extended candle data for detailed analysis
    const fromDate = new Date(
      consolidation.startTimestamp.getTime() - 6 * 60 * 60 * 1000
    ); // 6 hours before
    const toDate = consolidation.brokenAt
      ? new Date(consolidation.brokenAt.getTime() + 6 * 60 * 60 * 1000) // 6 hours after breakout
      : new Date(consolidation.endTimestamp!.getTime() + 6 * 60 * 60 * 1000);

    const allCandles = await getCandlesInDateRange(pair, fromDate, toDate, 1);

    // Find consolidation period candles
    const consolidationCandles = allCandles.filter(
      (candle) =>
        candle.timestamp >= consolidation.startTimestamp &&
        (consolidation.endTimestamp
          ? candle.timestamp <= consolidation.endTimestamp
          : true)
    );

    console.log(`\n🕐 CONSOLIDATION PERIOD ANALYSIS:`);
    console.log(`   Candles in period: ${consolidationCandles.length}`);

    if (consolidationCandles.length === 0) {
      console.log("❌ No candles found in consolidation period");
      return;
    }

    // Analyze price behavior within consolidation
    const closes = consolidationCandles.map((c) => c.close);
    const highs = consolidationCandles.map((c) => c.high);
    const lows = consolidationCandles.map((c) => c.low);

    const actualMin = Math.min(...lows);
    const actualMax = Math.max(...highs);
    const actualRange = actualMax - actualMin;
    const actualRangePercent = (actualRange / actualMin) * 100;

    console.log(`\n💹 PRICE ACTION ANALYSIS:`);
    console.log(`   Defined Support: ${consolidation.supportLevel.toFixed(5)}`);
    console.log(
      `   Actual Low: ${actualMin.toFixed(5)} (diff: ${(
        (consolidation.supportLevel - actualMin) *
        10000
      ).toFixed(1)} pips)`
    );
    console.log(
      `   Defined Resistance: ${consolidation.resistanceLevel.toFixed(5)}`
    );
    console.log(
      `   Actual High: ${actualMax.toFixed(5)} (diff: ${(
        (actualMax - consolidation.resistanceLevel) *
        10000
      ).toFixed(1)} pips)`
    );
    console.log(
      `   Actual Range: ${(actualRange * 10000).toFixed(
        1
      )} pips (${actualRangePercent.toFixed(2)}%)`
    );

    // Analyze level touches
    const tolerance = actualMin * 0.0002; // 0.02% tolerance for level touches
    let supportTouches = 0;
    let resistanceTouches = 0;

    for (const candle of consolidationCandles) {
      // Support touches (low near support)
      if (Math.abs(candle.low - consolidation.supportLevel) <= tolerance) {
        supportTouches++;
      }
      // Resistance touches (high near resistance)
      if (Math.abs(candle.high - consolidation.resistanceLevel) <= tolerance) {
        resistanceTouches++;
      }
    }

    console.log(`\n🎯 LEVEL TESTING ANALYSIS:`);
    console.log(
      `   Support touches: ${supportTouches}/${consolidationCandles.length} candles`
    );
    console.log(
      `   Resistance touches: ${resistanceTouches}/${consolidationCandles.length} candles`
    );

    // Analyze oscillation quality
    let directionChanges = 0;
    let totalOscillations = 0;
    let lastDirection = 0;

    for (let i = 2; i < closes.length; i++) {
      const prevDir =
        closes[i - 1] > closes[i - 2]
          ? 1
          : closes[i - 1] < closes[i - 2]
          ? -1
          : 0;
      const currDir =
        closes[i] > closes[i - 1] ? 1 : closes[i] < closes[i - 1] ? -1 : 0;

      if (currDir !== 0 && prevDir !== 0 && currDir !== prevDir) {
        directionChanges++;
      }

      if (currDir !== 0 && currDir !== lastDirection) {
        totalOscillations++;
        lastDirection = currDir;
      }
    }

    console.log(`\n🔄 OSCILLATION ANALYSIS:`);
    console.log(`   Direction changes: ${directionChanges}`);
    console.log(`   Total oscillations: ${totalOscillations}`);
    console.log(
      `   Oscillations per hour: ${(totalOscillations / duration).toFixed(1)}`
    );

    // Calculate volatility
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance =
      closes.reduce((sum, close) => sum + Math.pow(close - mean, 2), 0) /
      closes.length;
    const volatilityPercent = (Math.sqrt(variance) / mean) * 100;

    console.log(`   Volatility: ${volatilityPercent.toFixed(2)}%`);

    // Analyze breakout quality if available
    if (consolidation.brokenAt) {
      const breakoutCandles = allCandles.filter(
        (candle) =>
          candle.timestamp >= consolidation.brokenAt! &&
          candle.timestamp <=
            new Date(consolidation.brokenAt!.getTime() + 3 * 60 * 60 * 1000)
      );

      if (breakoutCandles.length > 0) {
        const breakoutMove =
          consolidation.breakoutDirection === "UP"
            ? Math.max(...breakoutCandles.map((c) => c.high)) -
              consolidation.resistanceLevel
            : consolidation.supportLevel -
              Math.min(...breakoutCandles.map((c) => c.low));

        console.log(`\n🚀 BREAKOUT ANALYSIS:`);
        console.log(`   Direction: ${consolidation.breakoutDirection}`);
        console.log(
          `   Breakout move: ${(breakoutMove * 10000).toFixed(1)} pips`
        );
        console.log(
          `   Move vs Range ratio: ${(breakoutMove / actualRange).toFixed(2)}x`
        );
        console.log(
          `   Matches trend: ${
            consolidation.isTrendDirection ? "YES ✅" : "NO ❌"
          }`
        );
      }
    }

    // Professional trader assessment
    console.log(`\n\n🏆 PROFESSIONAL TRADER ASSESSMENT:`);
    console.log(`================================================`);

    // Quality factors analysis
    const qualityFactors = [];
    const issues = [];

    // 1. Duration assessment
    if (duration >= 8 && duration <= 24) {
      qualityFactors.push("✅ Optimal duration (8-24h)");
    } else if (duration < 4) {
      issues.push("❌ Too short - likely noise, not real consolidation");
    } else if (duration > 48) {
      issues.push("⚠️ Very long - may be larger ranging market");
    } else {
      qualityFactors.push("⚠️ Acceptable duration but not optimal");
    }

    // 2. Range assessment
    if (actualRangePercent >= 0.15 && actualRangePercent <= 0.4) {
      qualityFactors.push("✅ Good range - tradeable without being too wide");
    } else if (actualRangePercent < 0.1) {
      issues.push("❌ Range too tight - likely noise or spread issues");
    } else if (actualRangePercent > 0.6) {
      issues.push("❌ Range too wide - not a consolidation, more like ranging");
    } else {
      qualityFactors.push("⚠️ Acceptable range but not ideal");
    }

    // 3. Level testing assessment
    const minTouches = Math.max(
      2,
      Math.floor(consolidationCandles.length * 0.15)
    );
    if (supportTouches >= minTouches && resistanceTouches >= minTouches) {
      qualityFactors.push("✅ Both levels properly tested");
    } else {
      issues.push(
        `❌ Insufficient level testing (need ${minTouches}+ touches each)`
      );
    }

    // 4. Oscillation assessment
    if (totalOscillations >= 3 && directionChanges >= 2) {
      qualityFactors.push("✅ Good price oscillation within range");
    } else {
      issues.push("❌ Insufficient oscillation - not enough bouncing action");
    }

    // 5. Volatility assessment
    if (volatilityPercent <= 0.4) {
      qualityFactors.push("✅ Low volatility - clean consolidation");
    } else if (volatilityPercent <= 0.8) {
      qualityFactors.push("⚠️ Moderate volatility - acceptable");
    } else {
      issues.push(
        "❌ High volatility - too choppy to be quality consolidation"
      );
    }

    // 6. Breakout assessment
    if (consolidation.brokenAt && consolidation.isTrendDirection) {
      qualityFactors.push("✅ Breakout aligns with trend direction");
    } else if (consolidation.brokenAt && !consolidation.isTrendDirection) {
      issues.push("❌ Breakout against trend - potential false signal");
    }

    // Final verdict
    console.log(`\n🎯 QUALITY FACTORS:`);
    qualityFactors.forEach((factor) => console.log(`   ${factor}`));

    console.log(`\n⚠️ ISSUES IDENTIFIED:`);
    if (issues.length === 0) {
      console.log(`   None - this appears to be a high-quality consolidation!`);
    } else {
      issues.forEach((issue) => console.log(`   ${issue}`));
    }

    // Overall rating
    const score =
      qualityFactors.length / (qualityFactors.length + issues.length);
    let rating, recommendation;

    if (score >= 0.8) {
      rating = "EXCELLENT";
      recommendation = "✅ TRADE - High probability setup";
    } else if (score >= 0.6) {
      rating = "GOOD";
      recommendation = "⚠️ CAUTIOUS TRADE - Monitor closely";
    } else if (score >= 0.4) {
      rating = "POOR";
      recommendation = "❌ AVOID - Too many issues";
    } else {
      rating = "TERRIBLE";
      recommendation = "❌ FALSE SIGNAL - Algorithm needs adjustment";
    }

    console.log(`\n📊 FINAL ASSESSMENT:`);
    console.log(`   Quality Rating: ${rating} (${(score * 100).toFixed(0)}%)`);
    console.log(`   Trading Recommendation: ${recommendation}`);

    if (score < 0.6) {
      console.log(`\n🔧 ALGORITHM ADJUSTMENT NEEDED:`);
      console.log(
        `   This consolidation should likely NOT have been detected.`
      );
      console.log(
        `   Consider tightening parameters to avoid such false signals.`
      );
    }
  } catch (error) {
    console.error("❌ Error in consolidation analysis:", error);
  }
}

analyzeConsolidation434().catch(console.error);
