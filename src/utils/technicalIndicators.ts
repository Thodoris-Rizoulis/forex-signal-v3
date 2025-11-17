import { ADX, EMA, ZigZag } from "trading-signals";
import { findSwingHighs, findSwingLows, SwingPoint } from "./swingAnalysis";

/**
 * Technical analysis utility functions for calculating moving averages and trend indicators
 */

export interface SignificantLevel {
  level: number;
  swingType: "high" | "low";
  significance: number;
  lastTouch: Date;
  index: number;
}

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

/**
 * Find major significant levels using ZigZag indicator (unified approach)
 * @param candles Array of candle objects with high, low, close properties
 * @param deviationPercent ZigZag deviation percentage (default: 5%)
 * @param maxLevels Maximum number of levels to return (default: 8)
 * @returns Array of significant levels with their properties or null if insufficient data
 */
export function findMajorSignificantLevels(
  candles: any[],
  deviationPercent: number = 5,
  maxLevels: number = 8
): Array<{
  level: number;
  significance: number;
  lastTouch: Date;
  swingType: "high" | "low";
}> | null {
  if (candles.length < 50) return null; // Need sufficient data for ZigZag

  const zigzag = new ZigZag({ deviation: deviationPercent / 100 });
  const zigzagPoints: Array<{
    price: number;
    index: number;
    type: "high" | "low";
  }> = [];

  // Process candles through ZigZag
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    zigzag.update(candle.close, false);

    if (zigzag.isStable) {
      const result = zigzag.getResult();
      if (result !== null) {
        // Determine if this is a swing high or low
        const prevCandle = i > 0 ? candles[i - 1] : null;
        const nextCandle = i < candles.length - 1 ? candles[i + 1] : null;

        if (prevCandle && nextCandle) {
          if (result > prevCandle.close && result > nextCandle.close) {
            zigzagPoints.push({ price: result, index: i, type: "high" });
          } else if (result < prevCandle.close && result < nextCandle.close) {
            zigzagPoints.push({ price: result, index: i, type: "low" });
          }
        }
      }
    }
  }

  if (zigzagPoints.length < 4) return null; // Need at least 4 swing points

  // Get all swing levels (both highs and lows)
  const allLevels = zigzagPoints.map((p) => p.price);

  // Group similar levels and calculate significance
  const significantLevels = groupLevelsBySignificanceUnified(
    allLevels,
    zigzagPoints,
    candles,
    maxLevels
  );

  return significantLevels;
}

/**
 * Group price levels and calculate their significance based on touches and recency (unified approach)
 * @param levels Array of price levels from swing points
 * @param swingPoints Array of swing point data with types
 * @param candles Array of candles to check touches
 * @param maxLevels Maximum levels to return
 * @returns Array of levels with significance scores and swing types
 */
function groupLevelsBySignificanceUnified(
  levels: number[],
  swingPoints: Array<{ price: number; index: number; type: "high" | "low" }>,
  candles: any[],
  maxLevels: number
): Array<{
  level: number;
  significance: number;
  lastTouch: Date;
  swingType: "high" | "low";
}> {
  const groupedLevels = groupSimilarLevels(levels);

  const result: Array<{
    level: number;
    significance: number;
    lastTouch: Date;
    swingType: "high" | "low";
  }> = [];

  for (const group of groupedLevels.slice(0, maxLevels)) {
    // Calculate touches across all candles
    const tolerance = group.level * 0.002; // 0.2% tolerance
    let touches = 0;
    let lastTouchIndex = -1;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      if (
        Math.abs(candle.high - group.level) <= tolerance ||
        Math.abs(candle.low - group.level) <= tolerance ||
        Math.abs(candle.close - group.level) <= tolerance
      ) {
        touches++;
        lastTouchIndex = i;
      }
    }

    // Find the most common swing type for this level
    const levelSwingPoints = swingPoints.filter(
      (p) => Math.abs(p.price - group.level) <= tolerance
    );
    const highCount = levelSwingPoints.filter((p) => p.type === "high").length;
    const lowCount = levelSwingPoints.filter((p) => p.type === "low").length;
    const swingType = highCount >= lowCount ? "high" : "low";

    // Calculate significance: swing count * 2 + touches + recency bonus
    const recencyBonus = lastTouchIndex > candles.length * 0.7 ? 2 : 0; // Recent touches get bonus
    const significance = group.count * 2 + touches + recencyBonus;

    result.push({
      level: group.level,
      significance,
      lastTouch:
        lastTouchIndex >= 0
          ? candles[lastTouchIndex].timestamp
          : candles[candles.length - 1].timestamp,
      swingType,
    });
  }

  // Sort by significance (highest first)
  return result.sort((a, b) => b.significance - a.significance);
}

/**
 * Find price traps between significant levels in recent candles
 * @param recentCandles Array of recent candle objects (last 24-48 hours)
 * @param significantLevels Array of significant levels from extended data
 * @param maxLevelDistancePercent Maximum price distance between levels for trap consideration (default: 3%)
 * @param minTrapDurationCandles Minimum duration for a valid trap (default: 6)
 * @returns Array of trap candidates with breakout potential
 */
export function findPriceTrapsBetweenLevels(
  recentCandles: any[],
  significantLevels: Array<{
    level: number;
    significance: number;
    lastTouch: Date;
    swingType: "high" | "low";
  }>,
  maxLevelDistancePercent: number = 3,
  minTrapDurationCandles: number = 6
): Array<{
  upperLevel: number;
  lowerLevel: number;
  trapStartIndex: number;
  trapEndIndex: number;
  trapDuration: number;
  breakoutDirection: "UP" | "DOWN" | null;
  breakoutStrength: number;
  trapQuality: number;
}> {
  if (
    recentCandles.length < minTrapDurationCandles ||
    significantLevels.length < 2
  ) {
    return [];
  }

  const traps: Array<{
    upperLevel: number;
    lowerLevel: number;
    trapStartIndex: number;
    trapEndIndex: number;
    trapDuration: number;
    breakoutDirection: "UP" | "DOWN" | null;
    breakoutStrength: number;
    trapQuality: number;
  }> = [];

  // Generate all reasonable level pairs based on price proximity
  const levelPairs = generateLevelPairs(
    significantLevels,
    maxLevelDistancePercent
  );

  for (const pair of levelPairs) {
    const trap = analyzeTrapBetweenLevels(
      recentCandles,
      pair.upperLevel,
      pair.lowerLevel,
      minTrapDurationCandles
    );

    if (trap) {
      traps.push(trap);
    }
  }

  // Sort by trap quality (highest first)
  return traps.sort((a, b) => b.trapQuality - a.trapQuality);
}

/**
 * Generate reasonable level pairs based on price proximity
 * @param levels Array of significant levels
 * @param maxDistancePercent Maximum price distance between levels
 * @returns Array of level pairs
 */
function generateLevelPairs(
  levels: Array<{
    level: number;
    significance: number;
    lastTouch: Date;
    swingType: "high" | "low";
  }>,
  maxDistancePercent: number
): Array<{ upperLevel: number; lowerLevel: number }> {
  const pairs: Array<{ upperLevel: number; lowerLevel: number }> = [];

  for (let i = 0; i < levels.length; i++) {
    for (let j = i + 1; j < levels.length; j++) {
      const level1 = levels[i].level;
      const level2 = levels[j].level;

      // Calculate price distance
      const distance = Math.abs(level1 - level2);
      const avgLevel = (level1 + level2) / 2;
      const distancePercent = (distance / avgLevel) * 100;

      // Only consider pairs within the maximum distance
      if (distancePercent <= maxDistancePercent) {
        const upperLevel = Math.max(level1, level2);
        const lowerLevel = Math.min(level1, level2);

        pairs.push({ upperLevel, lowerLevel });
      }
    }
  }

  return pairs;
}

/**
 * Analyze if there's a valid trap between two levels in recent candles
 * @param candles Array of recent candles
 * @param upperLevel Upper level price
 * @param lowerLevel Lower level price
 * @param minDuration Minimum trap duration
 * @returns Trap analysis result or null
 */
function analyzeTrapBetweenLevels(
  candles: any[],
  upperLevel: number,
  lowerLevel: number,
  minDuration: number
): {
  upperLevel: number;
  lowerLevel: number;
  trapStartIndex: number;
  trapEndIndex: number;
  trapDuration: number;
  breakoutDirection: "UP" | "DOWN" | null;
  breakoutStrength: number;
  trapQuality: number;
} | null {
  const levelRange = upperLevel - lowerLevel;
  const levelTolerance = levelRange * 0.05; // 5% tolerance for level touches

  let trapStartIndex = -1;
  let trapEndIndex = -1;
  let consecutiveTrapCandles = 0;
  let maxConsecutiveTrap = 0;
  let breakoutDirection: "UP" | "DOWN" | null = null;
  let breakoutStrength = 0;

  let upperLevelTouches = 0;
  let lowerLevelTouches = 0;

  // Scan candles for trap periods
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const isNearUpperLevel =
      Math.abs(candle.high - upperLevel) <= levelTolerance ||
      Math.abs(candle.low - upperLevel) <= levelTolerance ||
      Math.abs(candle.close - upperLevel) <= levelTolerance;

    const isNearLowerLevel =
      Math.abs(candle.high - lowerLevel) <= levelTolerance ||
      Math.abs(candle.low - lowerLevel) <= levelTolerance ||
      Math.abs(candle.close - lowerLevel) <= levelTolerance;

    // Count touches to levels
    if (isNearUpperLevel) upperLevelTouches++;
    if (isNearLowerLevel) lowerLevelTouches++;

    // Check if price is within the trap zone (between levels with small tolerance)
    const isWithinTrapZone =
      candle.low >= lowerLevel - levelTolerance &&
      candle.high <= upperLevel + levelTolerance;

    if (isWithinTrapZone || isNearUpperLevel || isNearLowerLevel) {
      if (trapStartIndex === -1) {
        trapStartIndex = i;
      }
      consecutiveTrapCandles++;
      trapEndIndex = i;
    } else {
      // Reset consecutive count when price moves outside trap zone
      consecutiveTrapCandles = 0;
      if (
        trapStartIndex !== -1 &&
        trapEndIndex - trapStartIndex + 1 >= minDuration
      ) {
        maxConsecutiveTrap = Math.max(
          maxConsecutiveTrap,
          trapEndIndex - trapStartIndex + 1
        );
      }
      trapStartIndex = -1;
    }
  }

  // Check final trap period
  if (
    trapStartIndex !== -1 &&
    trapEndIndex - trapStartIndex + 1 >= minDuration
  ) {
    maxConsecutiveTrap = Math.max(
      maxConsecutiveTrap,
      trapEndIndex - trapStartIndex + 1
    );
  }

  // If we found a valid trap period, analyze breakout
  if (maxConsecutiveTrap >= minDuration) {
    // Find the actual trap period (use the longest consecutive period)
    let bestTrapStart = -1;
    let bestTrapEnd = -1;
    let currentStart = -1;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const isWithinTrapZone =
        candle.low >= lowerLevel - levelTolerance &&
        candle.high <= upperLevel + levelTolerance;

      if (isWithinTrapZone) {
        if (currentStart === -1) {
          currentStart = i;
        }
      } else {
        if (currentStart !== -1) {
          const duration = i - currentStart;
          if (
            duration >= minDuration &&
            duration > bestTrapEnd - bestTrapStart
          ) {
            bestTrapStart = currentStart;
            bestTrapEnd = i - 1;
          }
        }
        currentStart = -1;
      }
    }

    // Check final period
    if (currentStart !== -1) {
      const duration = candles.length - currentStart;
      if (duration >= minDuration && duration > bestTrapEnd - bestTrapStart) {
        bestTrapStart = currentStart;
        bestTrapEnd = candles.length - 1;
      }
    }

    if (bestTrapStart !== -1) {
      // Check trap volatility - consolidation shouldn't have excessive movement
      const trapCandles = candles.slice(bestTrapStart, bestTrapEnd + 1);
      const trapRange = upperLevel - lowerLevel;
      const avgRange =
        trapCandles.reduce((sum, c) => sum + (c.high - c.low), 0) /
        trapCandles.length;
      const trapVolatility = avgRange / trapRange; // Average candle range as % of trap range

      // If trap has too much internal volatility, it's not a valid consolidation
      const maxTrapVolatility = 0.3; // Maximum 30% of trap range per candle on average
      if (trapVolatility > maxTrapVolatility) {
        return null; // Invalid trap due to excessive volatility
      }

      // Analyze breakout after trap
      const breakoutAnalysis = analyzeBreakoutAfterTrap(
        candles,
        bestTrapEnd,
        upperLevel,
        lowerLevel
      );

      breakoutDirection = breakoutAnalysis.direction;
      breakoutStrength = breakoutAnalysis.strength;

      // Calculate trap quality
      const trapDuration = bestTrapEnd - bestTrapStart + 1;
      const levelDistancePercent = (levelRange / lowerLevel) * 100;
      const trapQuality =
        (trapDuration / candles.length) * 100 + // Duration percentage
        (levelDistancePercent / 5) * 20 + // Level distance (normalized)
        (breakoutStrength > 0 ? 30 : 0) + // Breakout bonus
        upperLevelTouches * 5 +
        lowerLevelTouches * 5; // Touch bonus

      return {
        upperLevel,
        lowerLevel,
        trapStartIndex: bestTrapStart,
        trapEndIndex: bestTrapEnd,
        trapDuration,
        breakoutDirection,
        breakoutStrength,
        trapQuality,
      };
    }
  }

  return null;
}

/**
 * Analyze breakout after a trap period
 * @param candles Array of candles
 * @param trapEndIndex End index of trap period
 * @param upperLevel Upper level price
 * @param lowerLevel Lower level price
 * @returns Breakout analysis
 */
function analyzeBreakoutAfterTrap(
  candles: any[],
  trapEndIndex: number,
  upperLevel: number,
  lowerLevel: number
): { direction: "UP" | "DOWN" | null; strength: number } {
  const breakoutCandles = 5; // Look at next 5 candles for breakout confirmation
  let direction: "UP" | "DOWN" | null = null;
  let strength = 0;

  for (
    let i = trapEndIndex + 1;
    i < Math.min(trapEndIndex + 1 + breakoutCandles, candles.length);
    i++
  ) {
    const candle = candles[i];

    // Check for upside breakout (close must break above upper level)
    if (candle.close > upperLevel) {
      direction = "UP";
      strength = Math.max(
        strength,
        ((candle.close - upperLevel) / upperLevel) * 100
      );
    }

    // Check for downside breakout (close must break below lower level)
    if (candle.close < lowerLevel) {
      direction = "DOWN";
      strength = Math.max(
        strength,
        ((lowerLevel - candle.close) / lowerLevel) * 100
      );
    }
  }

  return { direction, strength };
}

/**
 * Alternative approach to find significant levels in trending markets
 * Uses recent swing highs/lows and major pivots instead of ZigZag
 * @param candles Array of candles
 * @returns Array of significant levels
 */
export function findAlternativeSignificantLevels(
  candles: any[]
): SignificantLevel[] {
  if (candles.length < 20) return [];

  const levels: SignificantLevel[] = [];
  const recentCandles = candles.slice(-Math.min(100, candles.length)); // Last 100 candles

  // Find recent swing highs and lows
  const swingHighs = findSwingHighs(recentCandles, 5, true) as SwingPoint[]; // 5-period swings, detailed
  const swingLows = findSwingLows(recentCandles, 5, true) as SwingPoint[];

  // Convert to levels with significance based on how recent and how significant the swing
  swingHighs.forEach((swing) => {
    const age = recentCandles.length - swing.index;
    const significance = Math.max(1, 10 - age / 10); // More recent = more significant

    levels.push({
      level: swing.price,
      swingType: "high",
      significance,
      lastTouch: new Date(), // We'll use current time since swingAnalysis doesn't provide timestamps
      index: swing.index,
    });
  });

  swingLows.forEach((swing) => {
    const age = recentCandles.length - swing.index;
    const significance = Math.max(1, 10 - age / 10);

    levels.push({
      level: swing.price,
      swingType: "low",
      significance,
      lastTouch: new Date(),
      index: swing.index,
    });
  });

  // Sort by significance and take top levels
  levels.sort((a, b) => b.significance - a.significance);
  return levels.slice(0, 8); // Return top 8 most significant levels
}

/**
 * Analyze trend strength and characteristics
 * @param candles Array of candles
 * @returns Trend analysis
 */
export function analyzeTrendStrength(candles: any[]): {
  direction: "UP" | "DOWN" | "SIDEWAYS";
  strength: number;
  periods: number;
  maxPullback: number;
} {
  if (candles.length < 20) {
    return { direction: "SIDEWAYS", strength: 0, periods: 0, maxPullback: 0 };
  }

  const prices = candles.map((c) => c.close);
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const totalChange = ((endPrice - startPrice) / startPrice) * 100;

  // Calculate max pullback
  let maxPullback = 0;
  let peak = startPrice;
  let trough = startPrice;

  for (const price of prices) {
    if (totalChange > 0) {
      // Uptrend - track pullbacks from peaks
      if (price > peak) peak = price;
      const pullback = ((peak - price) / peak) * 100;
      maxPullback = Math.max(maxPullback, pullback);
    } else {
      // Downtrend - track rallies from troughs
      if (price < trough) trough = price;
      const rally = ((price - trough) / trough) * 100;
      maxPullback = Math.max(maxPullback, rally);
    }
  }

  // Determine direction and strength
  let direction: "UP" | "DOWN" | "SIDEWAYS";
  let strength = Math.abs(totalChange);

  if (strength < 1) {
    direction = "SIDEWAYS";
  } else if (totalChange > 0) {
    direction = "UP";
  } else {
    direction = "DOWN";
  }

  return {
    direction,
    strength,
    periods: candles.length,
    maxPullback,
  };
}
