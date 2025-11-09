import { Rate } from "../models/Rate";
import { Pair } from "../models/Pair";
import { config } from "../config";
import { ATR } from "trading-signals";

/**
 * Utility functions for candle operations and technical analysis
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: Date;
}

/**
 * Aggregate minute-level rates into candles of specified timeframe
 * @param rates Array of Rate objects
 * @param fetchInterval Seconds between rate fetches (default: 60)
 * @param timeframeHours Hours per candle (default: 1)
 * @returns Array of candles
 */
export function aggregateToCandles(
  rates: Rate[],
  fetchInterval: number = 60,
  timeframeHours: number = 1
): Candle[] {
  if (rates.length === 0) return [];

  const candles: Candle[] = [];
  const intervalsPerTimeframe = Math.floor(
    (timeframeHours * 3600) / fetchInterval
  );

  // Align to hour boundaries: round first timestamp down to start of hour
  const firstTimestamp = new Date(rates[0].timestamp);
  const alignedStart = new Date(firstTimestamp);
  alignedStart.setMinutes(0, 0, 0); // Set to :00 of the hour

  let currentStart = alignedStart;
  let rateIndex = 0;

  while (rateIndex < rates.length) {
    const candleEnd = new Date(
      currentStart.getTime() + timeframeHours * 3600 * 1000
    );
    const timeframeRates: Rate[] = [];

    // Collect all rates within this timeframe
    while (rateIndex < rates.length && rates[rateIndex].timestamp < candleEnd) {
      timeframeRates.push(rates[rateIndex]);
      rateIndex++;
    }

    // Only create candle if we have sufficient data and the timeframe is complete
    const isCompleteTimeframe =
      (rateIndex >= rates.length || rates[rateIndex].timestamp >= candleEnd) &&
      candleEnd <= new Date();
    if (
      timeframeRates.length >= intervalsPerTimeframe * 0.8 &&
      isCompleteTimeframe
    ) {
      const open = +timeframeRates[0].rate;
      const close = +timeframeRates[timeframeRates.length - 1].rate;
      const high = Math.max(...timeframeRates.map((r) => +r.rate));
      const low = Math.min(...timeframeRates.map((r) => +r.rate));
      const timestamp = new Date(currentStart); // Use start of the period

      candles.push({ open, high, low, close, timestamp });
    }

    // Move to next timeframe
    currentStart = candleEnd;
  }

  return candles;
}

/**
 * Get candles for a pair within a specific date range
 * Filters out weekend periods where prices are stable (Saturday 00:00 - Sunday 23:59 UTC)
 * @param pair Pair object to get data for
 * @param fromDate Start date for the data range
 * @param toDate End date for the data range
 * @param timeframeHours Hours per candle
 * @returns Array of candles for the specified date range, excluding weekend stable periods
 */
export async function getCandlesInDateRange(
  pair: Pair,
  fromDate: Date,
  toDate: Date,
  timeframeHours: number
): Promise<Candle[]> {
  const fetchInterval = config.api.fetchInterval;

  // Fetch rates for the specified date range
  const rates = await pair.getRatesInDateRange(fromDate, toDate);

  // Aggregate rates into candles of the specified timeframe
  const candles = aggregateToCandles(rates, fetchInterval, timeframeHours);

  // Filter out weekend candles where prices are stable
  const filteredCandles = candles.filter(
    (candle) => !isWeekendStableCandle(candle)
  );

  return filteredCandles;
}

/**
 * Check if a candle falls within the stable weekend period
 * Stable period: Saturday 01:00 UTC to Sunday 23:00 UTC (market closed)
 * @param candle Candle to check
 * @returns true if candle should be filtered out
 */
function isWeekendStableCandle(candle: Candle): boolean {
  const timestamp = candle.timestamp;
  const dayOfWeek = timestamp.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hourOfDay = timestamp.getUTCHours();

  // Check if candle falls within the stable weekend period: Saturday 01:00 to Sunday 23:00 UTC
  const isSaturdayAfter1AM = dayOfWeek === 6 && hourOfDay >= 1;
  const isSundayBefore11PM = dayOfWeek === 0 && hourOfDay < 23;
  const isSundayAt11PM = dayOfWeek === 0 && hourOfDay === 23; // Include Sunday 23:00

  const isInStablePeriod =
    isSaturdayAfter1AM || isSundayBefore11PM || isSundayAt11PM;

  if (!isInStablePeriod) {
    return false; // Not in stable weekend period, keep the candle
  }

  // Only filter if price is stable (no movement) - this is a safety check
  const isStable = candle.high === candle.low && candle.open === candle.close;

  return isStable; // Filter out candles in stable weekend period with stable prices
}

/**
 * Calculate Average True Range (ATR) for volatility measurement using trading-signals library
 * @param candles Array of candles
 * @param period ATR period (default: 14)
 * @returns Array of ATR values
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) return [];

  const atr = new ATR(period);
  const atrValues: number[] = [];

  // Update ATR with each candle and collect results
  for (const candle of candles) {
    atr.update(
      {
        high: candle.high,
        low: candle.low,
        close: candle.close,
      },
      false
    );

    if (atr.isStable) {
      const result = atr.getResult();
      if (result !== null) {
        atrValues.push(result);
      }
    }
  }

  return atrValues;
}

/**
 * Get the latest ATR value from candles
 * @param candles Array of candles
 * @param period ATR period (default: 14)
 * @returns Latest ATR value or 0 if insufficient data
 */
export function getLatestATR(candles: Candle[], period: number = 14): number {
  const atrValues = calculateATR(candles, period);
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
}
