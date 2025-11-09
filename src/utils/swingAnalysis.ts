import { Candle } from "./candleUtils";

/**
 * Utility functions for swing point detection and trend analysis
 */

export interface SwingPoint {
  price: number;
  index: number;
  timestamp: Date;
}

/**
 * Swing point data structure
 */
export interface SwingPoint {
  price: number;
  index: number;
}

/**
 * Find swing highs in candle data
 * A swing high is a candle where both neighboring candles have lower highs
 * @param candles Array of candles
 * @param lookback Number of candles to look back/forward (default: 2)
 * @param returnDetailed Whether to return detailed SwingPoint objects or just prices (default: false)
 * @returns Array of swing high prices or SwingPoint objects
 */
export function findSwingHighs(
  candles: Candle[],
  lookback: number = 2,
  returnDetailed: boolean = false
): number[] | SwingPoint[] {
  const highs: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    let isSwingHigh = true;

    // Check if current high is higher than surrounding candles
    for (let j = 1; j <= lookback; j++) {
      if (
        current.high <= candles[i - j].high ||
        current.high <= candles[i + j].high
      ) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      highs.push({
        price: current.high,
        index: i,
        timestamp: current.timestamp,
      });
    }
  }

  return returnDetailed ? highs : highs.map((h) => h.price);
}

/**
 * Find swing lows in candle data
 * A swing low is a candle where both neighboring candles have higher lows
 * @param candles Array of candles
 * @param lookback Number of candles to look back/forward (default: 2)
 * @param returnDetailed Whether to return detailed SwingPoint objects or just prices (default: false)
 * @returns Array of swing low prices or SwingPoint objects
 */
export function findSwingLows(
  candles: Candle[],
  lookback: number = 2,
  returnDetailed: boolean = false
): number[] | SwingPoint[] {
  const lows: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const current = candles[i];
    let isSwingLow = true;

    // Check if current low is lower than surrounding candles
    for (let j = 1; j <= lookback; j++) {
      if (
        current.low >= candles[i - j].low ||
        current.low >= candles[i + j].low
      ) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      lows.push({ price: current.low, index: i, timestamp: current.timestamp });
    }
  }

  return returnDetailed ? lows : lows.map((l) => l.price);
}

/**
 * Check if candles show swing structure for a given direction
 * @param candles Array of candles
 * @param direction Trend direction to check for
 * @returns True if swing structure exists
 */
export function hasSwingStructure(
  candles: Candle[],
  direction: "UP" | "DOWN"
): boolean {
  if (candles.length < 5) return false;

  if (direction === "UP") {
    let consecutiveHigherHighs = 0;
    let consecutiveHigherLows = 0;
    let maxConsecutiveHH = 0;
    let maxConsecutiveHL = 0;

    for (let i = 1; i < candles.length; i++) {
      if (candles[i].high > candles[i - 1].high) {
        consecutiveHigherHighs++;
        maxConsecutiveHH = Math.max(maxConsecutiveHH, consecutiveHigherHighs);
      } else {
        consecutiveHigherHighs = 0;
      }

      if (candles[i].low > candles[i - 1].low) {
        consecutiveHigherLows++;
        maxConsecutiveHL = Math.max(maxConsecutiveHL, consecutiveHigherLows);
      } else {
        consecutiveHigherLows = 0;
      }
    }

    return maxConsecutiveHH >= 3 && maxConsecutiveHL >= 3;
  } else {
    let consecutiveLowerHighs = 0;
    let consecutiveLowerLows = 0;
    let maxConsecutiveLH = 0;
    let maxConsecutiveLL = 0;

    for (let i = 1; i < candles.length; i++) {
      if (candles[i].high < candles[i - 1].high) {
        consecutiveLowerHighs++;
        maxConsecutiveLH = Math.max(maxConsecutiveLH, consecutiveLowerHighs);
      } else {
        consecutiveLowerHighs = 0;
      }

      if (candles[i].low < candles[i - 1].low) {
        consecutiveLowerLows++;
        maxConsecutiveLL = Math.max(maxConsecutiveLL, consecutiveLowerLows);
      } else {
        consecutiveLowerLows = 0;
      }
    }

    return maxConsecutiveLH >= 3 && maxConsecutiveLL >= 3;
  }
}
