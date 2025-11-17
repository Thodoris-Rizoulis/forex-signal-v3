import { Pool } from 'pg';
import { getCandlesInDateRange } from '../src/utils/candleUtils';
import { findMajorSignificantLevels, findAlternativeSignificantLevels } from '../src/utils/technicalIndicators';
import { Pair } from '../src/models/Pair';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

async function analyzeConsolidation738() {
  console.log('🔍 Analyzing Consolidation 738');
  console.log('==============================\n');

  try {
    // 1. Get consolidation details
    console.log('1. Fetching Consolidation Details...');
    const consResult = await pool.query(
      'SELECT c.*, curr.code as currency_code, p.target_currency FROM "Consolidations" c ' +
      'JOIN "Pairs" p ON c.pair_id = p.id ' +
      'JOIN "Currencies" curr ON p.currency_id = curr.id ' +
      'WHERE c.id = $1',
      [738]
    );

    if (consResult.rows.length === 0) {
      console.log('❌ Consolidation 738 not found!');
      return;
    }

    const cons = consResult.rows[0];
    console.log('✅ Found consolidation:');
    console.log(`   Pair: ${cons.currency_code}/${cons.target_currency}`);
    console.log(`   Trend Direction: ${cons.trend_direction}`);
    console.log(`   Time Range: ${cons.start_timestamp} to ${cons.end_timestamp}`);
    console.log(`   Support Level: ${cons.support_level}`);
    console.log(`   Resistance Level: ${cons.resistance_level}`);
    console.log(`   Range: ${(cons.resistance_level - cons.support_level).toFixed(5)} (${((cons.resistance_level - cons.support_level) / cons.support_level * 100).toFixed(2)}%)`);
    console.log(`   Breakout: ${cons.breakout_direction} at ${cons.broken_at}`);
    console.log(`   Is Trend Direction: ${cons.is_trend_direction}\n`);

    // 2. Get pair details
    console.log('2. Fetching Pair Details...');
    const pair = await Pair.getById(cons.pair_id);
    if (!pair) {
      console.log('❌ Pair not found!');
      return;
    }
    console.log(`✅ Found pair: ${pair.currencyCode}/${pair.targetCurrency}\n`);

    // 3. Get candles for the consolidation period
    console.log('2. Fetching Candles for Consolidation Period...');
    const consolidationCandles = await getCandlesInDateRange(
      pair,
      new Date(cons.start_timestamp),
      new Date(cons.end_timestamp),
      1 // 1-hour candles
    );

    console.log(`✅ Found ${consolidationCandles.length} candles in consolidation period\n`);

    // 4. Analyze price action within consolidation
    console.log('3. Analyzing Price Action...');
    let touchesSupport = 0;
    let touchesResistance = 0;
    let breaksSupport = 0;
    let breaksResistance = 0;
    let highs: number[] = [];
    let lows: number[] = [];
    let closes: number[] = [];

    consolidationCandles.forEach((candle, i) => {
      highs.push(candle.high);
      lows.push(candle.low);
      closes.push(candle.close);

      // Check touches (using closes for chart comparison)
      if (candle.close <= cons.resistance_level * 1.0001 && candle.close >= cons.resistance_level * 0.9999) {
        touchesResistance++;
      }
      if (candle.close <= cons.support_level * 1.0001 && candle.close >= cons.support_level * 0.9999) {
        touchesSupport++;
      }

      // Check breaks
      if (candle.low < cons.support_level) breaksSupport++;
      if (candle.high > cons.resistance_level) breaksResistance++;
    });

    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const maxClose = Math.max(...closes);
    const minClose = Math.min(...closes);
    const actualRange = maxHigh - minLow;
    const closeRange = maxClose - minClose;
    const actualRangePercent = (actualRange / minLow) * 100;
    const closeRangePercent = (closeRange / minClose) * 100;

    console.log(`   Support Touches (closes): ${touchesSupport}`);
    console.log(`   Resistance Touches (closes): ${touchesResistance}`);
    console.log(`   Support Breaks: ${breaksSupport}`);
    console.log(`   Resistance Breaks: ${breaksResistance}`);
    console.log(`   Actual High/Low Range: ${minLow.toFixed(5)} - ${maxHigh.toFixed(5)} (${actualRangePercent.toFixed(2)}%)`);
    console.log(`   Close Range: ${minClose.toFixed(5)} - ${maxClose.toFixed(5)} (${closeRangePercent.toFixed(2)}%)`);
    console.log(`   Individual Candle Closes:`);

    consolidationCandles.forEach((candle, i) => {
      const closeVsSupport = ((candle.close - cons.support_level) / cons.support_level * 100).toFixed(2);
      const closeVsResistance = ((candle.close - cons.resistance_level) / cons.resistance_level * 100).toFixed(2);
      console.log(`     Candle ${i+1} (${candle.timestamp.toISOString().slice(11,19)}): Close=${candle.close.toFixed(5)} (${closeVsSupport}% from support, ${closeVsResistance}% from resistance)`);
    });
    console.log();

    // 5. Compare with detected levels
    console.log('4. Level Quality Analysis...');
    const supportAccuracy = Math.abs(cons.support_level - minLow) / minLow * 100;
    const resistanceAccuracy = Math.abs(cons.resistance_level - maxHigh) / maxHigh * 100;
    const rangeAccuracy = Math.abs((cons.resistance_level - cons.support_level) - actualRange) / actualRange * 100;

    console.log(`   Support Level Accuracy: ${supportAccuracy.toFixed(2)}% from actual low`);
    console.log(`   Resistance Level Accuracy: ${resistanceAccuracy.toFixed(2)}% from actual high`);
    console.log(`   Range Accuracy: ${rangeAccuracy.toFixed(2)}% from actual range`);

    // Quality assessment
    const isSupportGood = supportAccuracy < 0.1; // Within 0.1% of actual low
    const isResistanceGood = resistanceAccuracy < 0.1; // Within 0.1% of actual high
    const isRangeGood = rangeAccuracy < 5; // Within 5% of actual range

    console.log(`   Support Level Quality: ${isSupportGood ? '✅ EXCELLENT' : supportAccuracy < 0.5 ? '⚠️ GOOD' : '❌ POOR'}`);
    console.log(`   Resistance Level Quality: ${isResistanceGood ? '✅ EXCELLENT' : resistanceAccuracy < 0.5 ? '⚠️ GOOD' : '❌ POOR'}`);
    console.log(`   Range Detection Quality: ${isRangeGood ? '✅ EXCELLENT' : rangeAccuracy < 10 ? '⚠️ GOOD' : '❌ POOR'}\n`);

    // 6. Get extended data for level analysis (30 days)
    console.log('5. Analyzing Extended Context (30-day S/R Analysis)...');
    const extendedStart = new Date(cons.start_timestamp);
    extendedStart.setDate(extendedStart.getDate() - 30);

    const extendedCandles = await getCandlesInDateRange(
      pair,
      extendedStart,
      new Date(cons.end_timestamp),
      1
    );

    console.log(`   Extended period: ${extendedStart.toISOString()} to ${cons.end_timestamp}`);
    console.log(`   Extended candles: ${extendedCandles.length}`);

    // Test ZigZag levels
    let zigZagLevels = findMajorSignificantLevels(extendedCandles, 5, 8);
    if (!zigZagLevels || zigZagLevels.length < 2) {
      console.log('   ZigZag: ❌ Failed to find sufficient levels, using alternative method...');
      zigZagLevels = findAlternativeSignificantLevels(extendedCandles);
    }

    if (zigZagLevels && zigZagLevels.length > 0) {
      console.log(`   ZigZag found ${zigZagLevels.length} significant levels:`);
      zigZagLevels.slice(0, 5).forEach((level, i) => {
        const distanceFromSupport = Math.abs(level.level - cons.support_level) / cons.support_level * 100;
        const distanceFromResistance = Math.abs(level.level - cons.resistance_level) / cons.resistance_level * 100;
        const isNearSupport = distanceFromSupport < 0.5;
        const isNearResistance = distanceFromResistance < 0.5;

        console.log(`     Level ${i+1}: ${level.level.toFixed(5)} (${level.swingType}) - ${isNearSupport ? 'NEAR SUPPORT' : isNearResistance ? 'NEAR RESISTANCE' : 'OTHER'}`);
      });
    }

    // 7. Breakout analysis
    console.log('\n6. Breakout Analysis...');
    if (cons.broken_at) {
      const breakoutTime = new Date(cons.broken_at);
      const breakoutCandles = await getCandlesInDateRange(
        pair,
        new Date(breakoutTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
        new Date(breakoutTime.getTime() + 2 * 60 * 60 * 1000), // 2 hours after
        1
      );

      const breakoutCandle = breakoutCandles.find(c => {
        const candleTime = new Date(c.timestamp);
        return candleTime.getTime() <= breakoutTime.getTime() &&
               (candleTime.getTime() + 60 * 60 * 1000) > breakoutTime.getTime();
      });

      if (breakoutCandle) {
        console.log(`   Breakout Candle: ${breakoutCandle.timestamp}`);
        console.log(`   Open: ${breakoutCandle.open}, High: ${breakoutCandle.high}, Low: ${breakoutCandle.low}, Close: ${breakoutCandle.close}`);

        let breakoutStrength = 0;
        if (cons.breakout_direction === 'UP') {
          breakoutStrength = (breakoutCandle.close - cons.resistance_level) / cons.resistance_level * 100;
        } else {
          breakoutStrength = (cons.support_level - breakoutCandle.close) / cons.support_level * 100;
        }

        console.log(`   Breakout Strength: ${breakoutStrength.toFixed(2)}%`);
        console.log(`   Breakout Quality: ${breakoutStrength > 0.05 ? '✅ STRONG' : breakoutStrength > 0.02 ? '⚠️ MODERATE' : '❌ WEAK'}`);
      }
    }

    // 8. Overall assessment
    console.log('\n🎯 OVERALL ASSESSMENT');
    console.log('===================');

    const qualityScore = (isSupportGood ? 1 : 0) + (isResistanceGood ? 1 : 0) + (isRangeGood ? 1 : 0);
    const qualityRating = qualityScore === 3 ? 'EXCELLENT' : qualityScore === 2 ? 'GOOD' : qualityScore === 1 ? 'FAIR' : 'POOR';

    console.log(`Quality Score: ${qualityScore}/3 (${qualityRating})`);
    console.log(`Consolidation Duration: ${Math.round((new Date(cons.end_timestamp).getTime() - new Date(cons.start_timestamp).getTime()) / (1000 * 60 * 60))} hours`);
    console.log(`Range Size: ${actualRangePercent.toFixed(2)}% (${actualRangePercent < 2 ? 'TIGHT' : actualRangePercent < 5 ? 'MODERATE' : 'WIDE'})`);
    console.log(`Trend Alignment: ${cons.is_trend_direction ? '✅ ALIGNED' : '❌ COUNTER-TREND'}`);

    if (qualityScore >= 2 && cons.is_trend_direction && actualRangePercent < 3) {
      console.log('\n🎉 CONCLUSION: This is a HIGH-QUALITY consolidation signal!');
    } else if (qualityScore >= 1 && cons.is_trend_direction) {
      console.log('\n⚠️ CONCLUSION: This is a MODERATE quality consolidation signal.');
    } else {
      console.log('\n❌ CONCLUSION: This consolidation may need review.');
    }

  } catch (err) {
    console.error('❌ Error analyzing consolidation:', err);
  } finally {
    await pool.end();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeConsolidation738();
}

export { analyzeConsolidation738 };