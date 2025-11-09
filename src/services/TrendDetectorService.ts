import { Pair } from "../models/Pair";
import { config } from "../config";
import { createLogger } from "../utils/logger";
import { calculateEMA, calculateADX } from "../utils/technicalIndicators";
import { getCandlesInDateRange } from "../utils/candleUtils";

interface TrendAnalysisResult {
  isTrending: boolean;
  direction: "UP" | "DOWN" | undefined;
  adx: number | undefined;
  emaShort: number | undefined;
  emaLong: number | undefined;
  error?: string;
}

export class TrendDetectorService {
  private logger = createLogger("trend-detector");

  constructor() {}

  async detectTrends(): Promise<void> {
    try {
      this.logger.info("Starting trend detection for all pairs");

      const activePairs = await Pair.getActive();

      for (const pair of activePairs) {
        try {
          await this.detectTrend(pair, undefined, undefined, false, true);
        } catch (error) {
          this.logger.error(
            { pairId: pair.id, error },
            "Error detecting trend for pair"
          );
        }
      }

      this.logger.info("Completed trend detection for all pairs");
    } catch (error) {
      this.logger.error({ error }, "Error in trend detection service");
      throw error;
    }
  }

  public async detectTrend(
    pair: Pair,
    fromDate?: Date,
    toDate?: Date,
    isTesting?: boolean,
    extendRange: boolean = false
  ): Promise<void | TrendAnalysisResult> {
    if (isTesting) extendRange = true;
    const currentTime = new Date();
    const requiredCandles = config.trend.requiredCandles;

    // Determine initial date range
    let from: Date;
    let to: Date;
    if (fromDate && toDate) {
      from = fromDate;
      to = toDate;
    } else {
      from = new Date(currentTime.getTime() - requiredCandles * 60 * 60 * 1000);
      to = new Date(currentTime.getTime() - 1 * 60 * 60 * 1000);
    }

    // Try up to 5 times with extended range if extendRange is true
    const maxRetries = extendRange ? 5 : 0;
    let candles: any[] | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Fetch 1h candles
      candles = await getCandlesInDateRange(pair, from, to, 1);

      // Check for sufficient data
      if (candles && candles.length >= requiredCandles) {
        break; // Sufficient data found
      }

      // If we don't have enough data, extend the range for next attempt
      // Extend the range by 24 hours on each attempt
      const extensionHours = 24;
      from = new Date(from.getTime() - extensionHours * 60 * 60 * 1000);
    }

    // At this point, candles should have sufficient data
    if (!candles || candles.length + 10 < requiredCandles) {
      const error = `Insufficient data: ${
        candles?.length || 0
      } candles, need ${requiredCandles}`;
      this.logger.error({ pairId: pair.id }, error);
      return {
        isTrending: false,
        direction: undefined,
        adx: undefined,
        emaShort: undefined,
        emaLong: undefined,
        error,
      };
    }

    // Detect trend
    const closes = candles.map((c) => c.close);
    const candleCount = candles.length;

    const shortPeriod = Math.floor(candleCount * config.trend.emaShortPercent);
    const longPeriod = Math.floor(candleCount * config.trend.emaLongPercent);

    const emaShort = calculateEMA(closes, shortPeriod);
    const emaLong = calculateEMA(closes, longPeriod);

    let adxValue: number;
    let emaShortValue: number;
    let emaLongValue: number;

    if (!emaShort || !emaLong) {
      adxValue = 0;
      emaShortValue = 0;
      emaLongValue = 0;
    } else {
      adxValue = calculateADX(candles, config.trend.adxPeriod);
      emaShortValue = emaShort[emaShort.length - 1];
      emaLongValue = emaLong[emaLong.length - 1];
    }

    // Determine direction and trending
    const latestClose = candles[candles.length - 1].close;
    let direction: "UP" | "DOWN" | null = null;
    if (
      latestClose > emaShortValue &&
      latestClose > emaLongValue &&
      emaShortValue > emaLongValue
    ) {
      direction = "UP";
    } else if (
      latestClose < emaShortValue &&
      latestClose < emaLongValue &&
      emaShortValue < emaLongValue
    ) {
      direction = "DOWN";
    }

    const isTrending =
      direction !== null && adxValue > config.trend.adxThreshold;

    const result: TrendAnalysisResult = {
      isTrending,
      direction: direction || undefined,
      adx: adxValue,
      emaShort: emaShortValue,
      emaLong: emaLongValue,
      error: direction === null ? "No clear direction" : undefined,
    };

    // Update DB if not testing
    if (!isTesting) {
      const now = new Date();
      await Pair.update(pair.id, {
        isTrending: result.isTrending,
        trendDirection: result.isTrending ? result.direction : undefined,
        trendStrength: result.isTrending ? result.adx : undefined,
        trendDetectedAt: result.isTrending ? now : undefined,
        lastTrendCheck: now,
      });

      this.logger.debug(
        {
          pairId: pair.id,
          isTrending: result.isTrending,
          direction: result.direction,
          adx: result.adx,
        },
        "Updated trend information for pair"
      );
    }

    return result;
  }
}

export async function runTrendDetector() {
  const logger = createLogger("trend-detector-runner");
  const trendDetector = new TrendDetectorService();

  logger.info("Starting trend detector service");

  // Run initial trend detection on startup
  try {
    await trendDetector.detectTrends();
  } catch (error) {
    logger.error({ error }, "Error in initial trend detection");
  }

  // Schedule periodic trend detection
  const intervalMs = config.services.trendDetectorInterval;
  setInterval(async () => {
    try {
      await trendDetector.detectTrends();
    } catch (error) {
      logger.error({ error }, "Error in scheduled trend detection");
    }
  }, intervalMs);

  logger.info(
    { intervalMs },
    "Trend detector service started with periodic execution"
  );
}
