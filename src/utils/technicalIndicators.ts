import { ADX, EMA } from "trading-signals";
import { findSwingHighs, findSwingLows, SwingPoint } from "./swingAnalysis";

/**
 * Technical analysis utility functions for calculating moving averages and trend indicators
 */

/**
 * Calculate Exponential Moving Average for an array of prices
 * @param prices Array of price values
 * @param period Period for the moving average
 * @returns Array of EMA values or null if insufficient data
 */
export function calculateEMA(
  prices: number[],
  period: number
): number[] | null {
  const ema = new EMA(period);
  const results: number[] = [];

  for (const price of prices) {
    ema.update(price, false);
    if (ema.isStable) {
      const result = ema.getResult();
      if (result !== null) {
        results.push(result);
      }
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * Calculate Average Directional Index (ADX) for an array of candles
 * @param candles Array of candle objects with high, low, close properties
 * @param period Period for ADX calculation (default: 14)
 * @returns ADX value or 0 if insufficient data or not stable
 */
export function calculateADX(candles: any[], period: number = 14): number {
  if (candles.length < period * 2) return 0; // Need more data for ADX

  const adx = new ADX(period);

  // Update ADX with candle data
  for (const candle of candles) {
    adx.update(
      {
        high: candle.high,
        low: candle.low,
        close: candle.close,
      },
      false
    );
  }

  // Return ADX value if stable, otherwise 0
  if (adx.isStable) {
    const result = adx.getResult();
    return result !== null ? result : 0;
  }

  return 0;
}

/**
 * Identify support and resistance levels using swing point analysis
 * @param candles Array of candle objects with high, low, close properties
 * @param lookback Number of periods to look back for swing detection (default: 3)
 * @param minTouches Minimum touches required for a valid level (default: 2)
 * @returns Object with support and resistance levels or null if insufficient data
 */
export function findSupportResistanceLevels(
  candles: any[],
  lookback: number = 3,
  minTouches: number = 2
): {
  supportLevel: number;
  resistanceLevel: number;
  supportTouches: number;
  resistanceTouches: number;
} | null {
  if (candles.length < lookback * 2 + 1) return null;

  // Find swing highs and lows using consolidated swing analysis functions
  const swingHighs = findSwingHighs(candles, lookback, true) as SwingPoint[];
  const swingLows = findSwingLows(candles, lookback, true) as SwingPoint[];

  if (swingHighs.length < 2 || swingLows.length < 2) return null;

  // Group similar levels and find the most significant ones
  const resistanceLevels = groupSimilarLevels(swingHighs.map((s) => s.price));
  const supportLevels = groupSimilarLevels(swingLows.map((s) => s.price));

  // Find the most touched levels
  const bestResistance = findMostTouchedLevel(
    resistanceLevels,
    candles.map((c) => c.high)
  );
  const bestSupport = findMostTouchedLevel(
    supportLevels,
    candles.map((c) => c.low)
  );

  if (!bestResistance || !bestSupport) return null;
  if (bestResistance.touches < minTouches || bestSupport.touches < minTouches)
    return null;

  return {
    supportLevel: bestSupport.level,
    resistanceLevel: bestResistance.level,
    supportTouches: bestSupport.touches,
    resistanceTouches: bestResistance.touches,
  };
}

/**
 * Enhanced consolidation bound detection using support/resistance levels
 * @param candles Array of candle objects
 * @param lookback Number of periods to look back for swing detection (default: 3)
 * @param minTouches Minimum touches required for a valid level (default: 2)
 * @returns Consolidation bounds or null
 */
export function detectConsolidationBounds(
  candles: any[],
  lookback: number = 3,
  minTouches: number = 2
): { upperBound: number; lowerBound: number; confidence: number } | null {
  const levels = findSupportResistanceLevels(candles, lookback, minTouches);

  if (!levels) return null;

  const { supportLevel, resistanceLevel, supportTouches, resistanceTouches } =
    levels;

  // Calculate confidence based on touch frequency
  const avgTouches = (supportTouches + resistanceTouches) / 2;
  const confidence = Math.min(avgTouches / 8, 1); // Max confidence at 8+ avg touches

  return {
    upperBound: resistanceLevel,
    lowerBound: supportLevel,
    confidence,
  };
}

/**
 * Group similar price levels together
 * @param levels Array of price levels
 * @param tolerancePercent Tolerance for grouping levels (default: 0.1%)
 * @returns Array of grouped levels with their occurrence count
 */
function groupSimilarLevels(
  levels: number[],
  tolerancePercent: number = 0.001
): Array<{ level: number; count: number }> {
  if (levels.length === 0) return [];

  const groups: Array<{ level: number; count: number; values: number[] }> = [];

  for (const level of levels) {
    let addedToGroup = false;

    // Try to add to existing group
    for (const group of groups) {
      const tolerance = group.level * tolerancePercent;
      if (Math.abs(level - group.level) <= tolerance) {
        group.values.push(level);
        group.level =
          group.values.reduce((sum, val) => sum + val, 0) / group.values.length; // Recalculate average
        group.count = group.values.length;
        addedToGroup = true;
        break;
      }
    }

    // Create new group if not added to existing
    if (!addedToGroup) {
      groups.push({ level, count: 1, values: [level] });
    }
  }

  // Sort by count (most frequent first)
  return groups
    .map((group) => ({ level: group.level, count: group.count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Find the level that has been touched the most times
 * @param groupedLevels Array of grouped levels
 * @param prices Array of prices to check touches against
 * @returns Best level with touch count or null
 */
function findMostTouchedLevel(
  groupedLevels: Array<{ level: number; count: number }>,
  prices: number[]
): { level: number; touches: number } | null {
  if (groupedLevels.length === 0) return null;

  let bestLevel = groupedLevels[0];
  let maxTouches = 0;

  for (const levelGroup of groupedLevels) {
    const tolerance = levelGroup.level * 0.002; // 0.2% tolerance for touches
    let touches = 0;

    for (const price of prices) {
      if (Math.abs(price - levelGroup.level) <= tolerance) {
        touches++;
      }
    }

    // Combine swing count and touch count for scoring
    const score = levelGroup.count * 2 + touches; // Weight swing occurrences more

    if (score > maxTouches) {
      maxTouches = touches;
      bestLevel = levelGroup;
    }
  }

  return {
    level: bestLevel.level,
    touches: maxTouches,
  };
}
