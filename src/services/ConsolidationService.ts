import { Pair } from "../models/Pair";
import { Consolidation } from "../models/Consolidation";
import { Opportunity } from "../models/Opportunity";
import { Strategy } from "../models/Strategy";
import { config } from "../config";
import { getCandlesInDateRange, Candle } from "../utils/candleUtils";
import { createLogger } from "../utils/logger";
import { sendTelegramMessage } from "../utils/telegram";

const logger = createLogger("consolidation-service");
const STRATEGY_NAME = "Consolidation Breakout";

interface ConsolidationAnalysisResult {
  consolidations: Consolidation[]; // Array of consolidations found/created
  error?: string;
}

interface ConsolidationCandidate {
  support: number;
  resistance: number;
  startIdx: number;
  endIdx: number;
  breakoutDirection: "UP" | "DOWN";
  breakoutTimestamp: Date;
  breakoutCandle: Candle;
}

interface ConsolidationPeriod {
  startIdx: number;
  endIdx: number;
  support: number;
  resistance: number;
  rangePercent: number;
  directionChanges: number;
  volatilityPercent: number;
  isValid: boolean;
  candleCount: number;
}

export class ConsolidationService {
  private readonly lookbackHours = config.consolidation.lookbackHours;
  private readonly minConsolidationCandles =
    config.consolidation.minConsolidationCandles;
  private readonly maxConsolidationRangePercent =
    config.consolidation.maxConsolidationRangePercent;
  private readonly minConsolidationRangePercent =
    config.consolidation.minConsolidationRangePercent;
  private readonly maxConsolidationVolatilityPercent =
    config.consolidation.maxConsolidationVolatilityPercent;
  private readonly minDirectionChanges =
    config.consolidation.minDirectionChanges;
  private readonly breakoutConfirmationCandles =
    config.consolidation.breakoutConfirmationCandles;

  async detect(): Promise<void> {
    logger.info("Starting simplified consolidation detection");

    const allPairs = await Pair.getAll();
    const trendingPairs = allPairs.filter(
      (pair) =>
        pair.active &&
        pair.isTrending &&
        pair.trendDirection !== undefined &&
        pair.trendDirection !== null
    );

    for (const pair of trendingPairs) {
      try {
        await this.evaluatePair(pair);
      } catch (error) {
        logger.error(
          { error, pairId: pair.id },
          "Error evaluating consolidation for pair"
        );
      }
    }

    logger.info("Simplified consolidation detection cycle complete");
  }

  public async evaluatePair(
    pair: Pair,
    fromDate?: Date,
    toDate?: Date,
    isTesting?: boolean
  ): Promise<ConsolidationAnalysisResult | void> {
    // Calculate date range for the required historical data
    const actualToDate = toDate || new Date();
    const actualFromDate =
      fromDate ||
      new Date(actualToDate.getTime() - this.lookbackHours * 60 * 60 * 1000);

    const hourlyCandles = await getCandlesInDateRange(
      pair,
      actualFromDate,
      actualToDate,
      1
    );

    if (
      hourlyCandles.length <
      this.minConsolidationCandles + this.breakoutConfirmationCandles
    ) {
      const error = `Insufficient candles for consolidation analysis: ${
        hourlyCandles.length
      }, minimum ${
        this.minConsolidationCandles + this.breakoutConfirmationCandles
      } required`;
      logger.debug({ pairId: pair.id, candles: hourlyCandles.length }, error);
      if (isTesting) {
        return { consolidations: [], error };
      }
      return;
    }

    logger.info(
      {
        pairId: pair.id,
        candles: hourlyCandles.length,
        fromDate: actualFromDate,
        toDate: actualToDate,
      },
      "Starting consolidation analysis"
    );

    // Find consolidation candidates with breakouts
    const candidates = this.findConsolidationCandidates(hourlyCandles);

    logger.info(
      { pairId: pair.id, candidates: candidates.length },
      "Found consolidation candidates"
    );

    // Add detailed debug for investigation
    if (candidates.length === 0) {
      logger.info(
        { pairId: pair.id, candles: hourlyCandles.length },
        "No candidates found - checking why"
      );
      // Log some sample windows
      for (let i = 0; i < Math.min(5, hourlyCandles.length - 10); i++) {
        const sampleWindow = hourlyCandles.slice(i, i + 10);
        const support = Math.min(...sampleWindow.map((c) => c.close));
        const resistance = Math.max(...sampleWindow.map((c) => c.close));
        const range = resistance - support;
        logger.info(
          { pairId: pair.id, windowStart: i, support, resistance, range },
          "Sample window analysis"
        );
      }
    }

    const consolidations: Consolidation[] = [];
    logger.info(
      { pairId: pair.id, candidatesCount: candidates.length },
      "Processing %d deduplicated candidates",
      candidates.length
    );

    for (const candidate of candidates) {
      logger.debug(
        {
          candidateIndex: candidates.indexOf(candidate),
          breakoutTimestamp: candidate.breakoutTimestamp,
          support: candidate.support,
          resistance: candidate.resistance,
          breakoutDirection: candidate.breakoutDirection,
        },
        "Processing candidate after deduplication"
      );

      // Check for existing consolidation in this time range
      const allConsolidations = await Consolidation.findAllByPair(pair.id);
      const existing = allConsolidations.filter(
        (cons) =>
          cons.startTimestamp <= candidate.breakoutTimestamp &&
          cons.endTimestamp &&
          cons.endTimestamp >=
            new Date(candidate.breakoutTimestamp.getTime() - 60 * 60 * 1000)
      );

      logger.debug(
        {
          pairId: pair.id,
          breakoutTimestamp: candidate.breakoutTimestamp,
          totalExisting: allConsolidations.length,
          overlappingExisting: existing.length,
        },
        "Checking for existing consolidations"
      );

      if (existing.length > 0) {
        logger.debug(
          { pairId: pair.id, breakoutTimestamp: candidate.breakoutTimestamp },
          "Consolidation already exists for this breakout, skipping"
        );
        continue;
      }

      logger.debug(
        { pairId: pair.id, breakoutTimestamp: candidate.breakoutTimestamp },
        "Creating consolidation for candidate"
      );

      // Create consolidation
      const consolidation = await this.createConsolidationFromCandidate(
        pair,
        candidate
      );
      consolidations.push(consolidation);

      // Create opportunity if breakout matches trend direction
      if (candidate.breakoutDirection === pair.trendDirection) {
        await this.createOpportunityFromConsolidation(consolidation, pair);
      }
    }

    logger.info(
      { pairId: pair.id, consolidations: consolidations.length },
      "Created consolidations"
    );

    if (isTesting) {
      return { consolidations };
    }
    // For production, don't return anything
  }

  private findConsolidationCandidates(
    candles: Candle[]
  ): ConsolidationCandidate[] {
    const candidates: ConsolidationCandidate[] = [];

    // New approach: Find consolidation periods based on price oscillation patterns
    const consolidationPeriods =
      this.findConsolidationPeriodsByOscillation(candles);
    const validConsolidations = consolidationPeriods.filter((p) => p.isValid);

    logger.debug(
      `Found ${validConsolidations.length} valid consolidation periods by oscillation analysis`
    );

    // For each valid consolidation, check for breakouts
    for (const consolidation of validConsolidations) {
      // Check for breakout in candles after consolidation ends
      const breakoutStartIdx = consolidation.endIdx + 1;
      const breakoutEndIdx = Math.min(
        breakoutStartIdx + this.breakoutConfirmationCandles - 1,
        candles.length - 1
      );

      if (breakoutStartIdx >= candles.length) continue; // No candles after consolidation

      const breakoutCandles = candles.slice(
        breakoutStartIdx,
        breakoutEndIdx + 1
      );
      const breakout = this.detectBreakout(
        breakoutCandles,
        consolidation.support,
        consolidation.resistance
      );

      if (breakout) {
        candidates.push({
          support: consolidation.support,
          resistance: consolidation.resistance,
          startIdx: consolidation.startIdx,
          endIdx: consolidation.endIdx,
          breakoutDirection: breakout.direction,
          breakoutTimestamp: breakout.timestamp,
          breakoutCandle: breakout.candle,
        });

        logger.debug(
          `Found breakout candidate: ${
            breakout.direction
          } breakout at ${breakout.timestamp.toISOString()}, range: ${consolidation.support.toFixed(
            4
          )}-${consolidation.resistance.toFixed(
            4
          )} (${consolidation.rangePercent.toFixed(2)}%)`
        );
      }
    }

    // Remove duplicates (prefer consolidations with cleaner breakouts)
    const uniqueCandidates = this.deduplicateCandidates_2(candidates);
    logger.info(
      `Consolidation candidates: ${uniqueCandidates.length} unique from ${candidates.length} total`
    );
    return uniqueCandidates;
  }

  /**
   * Find consolidation periods based on price oscillation patterns
   * This approach analyzes actual price behavior within potential consolidation ranges
   */
  private findConsolidationPeriodsByOscillation(
    candles: Candle[]
  ): ConsolidationPeriod[] {
    const periods: ConsolidationPeriod[] = [];

    // Minimum consolidation duration (in candles)
    const minConsolidationLength = this.minConsolidationCandles;
    const maxConsolidationLength = Math.min(48, candles.length); // Max 48 hours

    // Analyze sliding windows for consolidation patterns
    for (
      let startIdx = 0;
      startIdx < candles.length - minConsolidationLength;
      startIdx++
    ) {
      for (
        let endIdx = startIdx + minConsolidationLength - 1;
        endIdx < Math.min(startIdx + maxConsolidationLength, candles.length);
        endIdx++
      ) {
        const windowCandles = candles.slice(startIdx, endIdx + 1);
        const consolidation = this.analyzeOscillationConsolidation(
          windowCandles,
          startIdx,
          endIdx
        );

        if (consolidation) {
          periods.push(consolidation);
        }
      }
    }

    return periods;
  }

  /**
   * Analyze a window of candles for consolidation based on oscillation patterns
   */
  private analyzeOscillationConsolidation(
    windowCandles: Candle[],
    startIdx: number,
    endIdx: number
  ): ConsolidationPeriod | null {
    if (windowCandles.length < this.minConsolidationCandles) return null;

    const closes = windowCandles.map((c) => c.close);
    const highs = windowCandles.map((c) => c.high);
    const lows = windowCandles.map((c) => c.low);

    // Find the actual price range during this period
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const rangePercent = ((maxPrice - minPrice) / minPrice) * 100;

    // Check if range is within consolidation bounds
    if (
      rangePercent > this.maxConsolidationRangePercent ||
      rangePercent < this.minConsolidationRangePercent
    ) {
      return null;
    }

    // Analyze price oscillation pattern
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

    // Calculate volatility (standard deviation of closes)
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance =
      closes.reduce((sum, close) => sum + Math.pow(close - mean, 2), 0) /
      closes.length;
    const volatilityPercent = (Math.sqrt(variance) / mean) * 100;

    // Validate consolidation criteria
    const isValid =
      directionChanges >= this.minDirectionChanges &&
      totalOscillations >= this.minDirectionChanges + 1 && // minOscillations = minDirectionChanges + 1
      volatilityPercent <= this.maxConsolidationVolatilityPercent &&
      windowCandles.length >= this.minConsolidationCandles;

    if (!isValid) return null;

    //Validate that levels are actually tested during consolidation
    // const tolerance = minPrice * 0.0001; // 0.01% tolerance for level touches
    // let supportTouches = 0;
    // let resistanceTouches = 0;

    // for (const candle of windowCandles) {
    //   // Count touches of support level
    //   if (
    //     Math.abs(candle.low - minPrice) <= tolerance ||
    //     Math.abs(candle.high - minPrice) <= tolerance
    //   ) {
    //     supportTouches++;
    //   }
    //   // Count touches of resistance level
    //   if (
    //     Math.abs(candle.high - maxPrice) <= tolerance ||
    //     Math.abs(candle.low - maxPrice) <= tolerance
    //   ) {
    //     resistanceTouches++;
    //   }
    // }

    // // Require minimum level touches for valid consolidation
    // const minTouchesRequired = Math.max(
    //   2,
    //   Math.floor(windowCandles.length * 0.08)
    // ); // At least 2 or 8% of candles
    // if (
    //   supportTouches < minTouchesRequired ||
    //   resistanceTouches < minTouchesRequired
    // ) {
    //   return null; // Levels not sufficiently tested - not a valid consolidation
    // }

    return {
      startIdx,
      endIdx,
      support: minPrice,
      resistance: maxPrice,
      rangePercent,
      directionChanges,
      volatilityPercent,
      isValid: true,
      candleCount: windowCandles.length,
    };
  }

  private detectBreakout(
    candles: Candle[],
    support: number,
    resistance: number
  ): { direction: "UP" | "DOWN"; timestamp: Date; candle: Candle } | null {
    for (const candle of candles) {
      if (candle.close > resistance) {
        return { direction: "UP", timestamp: candle.timestamp, candle };
      } else if (candle.close < support) {
        return { direction: "DOWN", timestamp: candle.timestamp, candle };
      }
    }
    return null;
  }

  private deduplicateCandidates(
    candidates: ConsolidationCandidate[]
  ): ConsolidationCandidate[] {
    console.log(
      `Deduplicating ${candidates.length} candidates with quality-based approach`
    );

    // Calculate quality scores for all candidates
    const candidatesWithScores = candidates.map((candidate) => ({
      ...candidate,
      qualityScore: this.calculateConsolidationQuality(candidate),
    }));

    // Sort by quality score (highest first), then by window size
    candidatesWithScores.sort((a, b) => {
      const scoreDiff = b.qualityScore - a.qualityScore;
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff; // Significant score difference

      // If scores are similar, prefer larger windows
      return b.endIdx - b.startIdx - (a.endIdx - a.startIdx);
    });

    const selected: ConsolidationCandidate[] = [];
    const usedRanges: { start: number; end: number }[] = [];

    for (const candidate of candidatesWithScores) {
      // Calculate maximum overlap with already selected candidates
      let maxOverlapPercent = 0;
      for (const existing of selected) {
        const overlapPercent = this.calculateOverlapPercent(
          candidate,
          existing
        );
        maxOverlapPercent = Math.max(maxOverlapPercent, overlapPercent);
      }

      // Allow candidates with less than 40% overlap
      const MAX_ALLOWED_OVERLAP = 0.4;
      if (maxOverlapPercent < MAX_ALLOWED_OVERLAP) {
        selected.push(candidate);
        usedRanges.push({ start: candidate.startIdx, end: candidate.endIdx });
        console.log(
          `Selected candidate: windows ${candidate.startIdx}-${
            candidate.endIdx
          }, score: ${candidate.qualityScore.toFixed(2)}, max overlap: ${(
            maxOverlapPercent * 100
          ).toFixed(1)}%`
        );
      } else {
        console.log(
          `Rejected candidate: windows ${candidate.startIdx}-${
            candidate.endIdx
          }, score: ${candidate.qualityScore.toFixed(2)}, overlap too high: ${(
            maxOverlapPercent * 100
          ).toFixed(1)}%`
        );
      }
    }

    console.log(
      `Deduplication result: ${selected.length} selected from ${candidates.length} total`
    );
    return selected;
  }

  private deduplicateCandidates_2(
    candidates: ConsolidationCandidate[]
  ): ConsolidationCandidate[] {
    console.log(
      `Deduplicating ${candidates.length} candidates with quality-based approach`
    );

    // Calculate quality scores for all candidates
    const candidatesWithScores = candidates.map((candidate) => ({
      ...candidate,
      qualityScore: this.calculateConsolidationQuality(candidate),
    }));

    // Sort by quality score (highest first), then by window size
    candidatesWithScores.sort((a, b) => {
      const scoreDiff = b.qualityScore - a.qualityScore;
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff; // Significant score difference

      // If scores are similar, prefer larger windows
      return b.endIdx - b.startIdx - (a.endIdx - a.startIdx);
    });

    const unique: ConsolidationCandidate[] = [];
    const usedRanges: { start: number; end: number }[] = [];

    for (const candidate of candidatesWithScores) {
      const overlaps = usedRanges.some(
        (range) =>
          candidate.startIdx <= range.end && candidate.endIdx >= range.start
      );

      if (!overlaps) {
        unique.push(candidate);
        usedRanges.push({ start: candidate.startIdx, end: candidate.endIdx });
      }
    }

    console.log(
      `Deduplication result: ${unique.length} unique from ${candidates.length} total`
    );
    return unique;
  }

  private calculateConsolidationQuality(
    candidate: ConsolidationCandidate
  ): number {
    // Quality factors (0-1 scale, weighted)
    const range = candidate.resistance - candidate.support;
    const rangePercent = (range / candidate.support) * 100;

    // Factor 1: Range tightness (prefer tighter ranges)
    const rangeScore = Math.max(0, 1 - (rangePercent - 0.25) / 0.25); // Best at 0.25%, worse as it increases

    // Factor 2: Window size (prefer larger windows for more data)
    const windowSize = candidate.endIdx - candidate.startIdx + 1;
    const sizeScore = Math.min(1, windowSize / 24); // Max score at 24+ hours

    // Factor 3: Breakout direction alignment (assume we have trend info)
    // For now, give neutral score - could be improved with trend data
    const breakoutScore = 0.5;

    // Weighted combination
    const qualityScore =
      rangeScore * 0.5 + // 50% - tightness
      sizeScore * 0.3 + // 30% - size
      breakoutScore * 0.2; // 20% - breakout quality

    return Math.max(0, Math.min(1, qualityScore)); // Clamp to 0-1
  }

  private calculateOverlapPercent(
    a: ConsolidationCandidate,
    b: ConsolidationCandidate
  ): number {
    const start = Math.max(a.startIdx, b.startIdx);
    const end = Math.min(a.endIdx, b.endIdx);

    if (start > end) return 0; // No overlap

    const overlapLength = end - start + 1;
    const aLength = a.endIdx - a.startIdx + 1;
    const bLength = b.endIdx - b.startIdx + 1;

    // Return overlap as percentage of the smaller window
    const smallerLength = Math.min(aLength, bLength);
    return overlapLength / smallerLength;
  }

  private async createConsolidationFromCandidate(
    pair: Pair,
    candidate: ConsolidationCandidate
  ): Promise<Consolidation> {
    const windowCandles = await getCandlesInDateRange(
      pair,
      new Date(
        candidate.breakoutTimestamp.getTime() -
          (candidate.endIdx - candidate.startIdx + 1) * 60 * 60 * 1000
      ),
      candidate.breakoutTimestamp,
      1
    );

    // Create consolidation
    const consolidation: Consolidation = await Consolidation.create({
      pairId: pair.id,
      trendDirection: pair.trendDirection as "UP" | "DOWN",
      startTimestamp: windowCandles[0].timestamp,
      endTimestamp: candidate.breakoutTimestamp,
      resistanceLevel: candidate.resistance,
      supportLevel: candidate.support,
      brokenAt: candidate.breakoutTimestamp,
      breakoutDirection: candidate.breakoutDirection,
      isTrendDirection: candidate.breakoutDirection === pair.trendDirection,
    });

    logger.info(
      {
        consolidationId: consolidation.id,
        pairId: pair.id,
        breakoutDirection: candidate.breakoutDirection,
        support: candidate.support,
        resistance: candidate.resistance,
      },
      "Created consolidation from breakout detection"
    );

    return consolidation;
  }

  private async createOpportunityFromConsolidation(
    consolidation: Consolidation,
    pair: Pair
  ): Promise<void> {
    const strategyRow = await Strategy.findByName(STRATEGY_NAME);
    if (!strategyRow || !strategyRow.active) {
      logger.debug("Consolidation Breakout strategy is disabled");
      return;
    }

    const signalType =
      consolidation.breakoutDirection === "UP" ? "BUY" : "SELL";
    const entryRate =
      consolidation.breakoutDirection === "UP"
        ? consolidation.resistanceLevel
        : consolidation.supportLevel;
    // Use a simple percentage-based stop loss since we don't store ATR anymore
    const stopLossPercent = 0.005; // 0.5% stop loss
    const stopLossRate =
      consolidation.breakoutDirection === "UP"
        ? entryRate * (1 - stopLossPercent)
        : entryRate * (1 + stopLossPercent);
    const takeProfitRate =
      consolidation.breakoutDirection === "UP"
        ? entryRate + (entryRate - stopLossRate) * 2
        : entryRate - (stopLossRate - entryRate) * 2;

    const details = `Consolidation breakout - ${signalType} signal`;

    const opportunity = await Opportunity.createOne(
      pair.id,
      strategyRow.id,
      consolidation.id, // Link to the consolidation that created this opportunity
      details,
      entryRate,
      stopLossRate,
      takeProfitRate,
      undefined, // pnlAmount
      signalType
    );

    logger.info(
      {
        opportunityId: opportunity.id,
        consolidationId: consolidation.id,
        signalType,
        entryRate,
      },
      "Created opportunity from consolidation breakout"
    );

    // Send Telegram notification
    //     try {
    //       const pairName = `${pair.currencyCode}/${pair.targetCurrency}`;
    //       const message = `🚀 *TRADING OPPORTUNITY DETECTED*

    // 📈 **${pairName}** - On trend ${pair.trendDirection}

    // 🎯 *Trap detected and broken*
    // Time: ${consolidation.brokenAt?.toLocaleString()} UTC

    // 📊 *Support:* ${consolidation.supportLevel.toFixed(5)}
    // 📈 *Resistance:* ${consolidation.resistanceLevel.toFixed(5)}

    // ⚡ *Possible ${signalType} Signal*
    // ⏳ *Wait for retest*`;

    //       await sendTelegramMessage(message);
    //     } catch (error) {
    //       logger.error(
    //         { error },
    //         "Failed to send Telegram notification for opportunity"
    //       );
    //     }

    //     // Broadcast is handled by createOne
  }
}

export async function runConsolidationService() {
  const service = new ConsolidationService();
  const intervalMs = config.services.consolidationInterval;

  logger.info({ intervalMs }, "Starting consolidation service");

  try {
    await service.detect();
  } catch (error) {
    logger.error({ error }, "Error during initial consolidation detection");
  }

  setInterval(async () => {
    try {
      await service.detect();
    } catch (error) {
      logger.error({ error }, "Error in consolidation detection loop");
    }
  }, intervalMs);
}
