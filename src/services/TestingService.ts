import { Pair } from "../models/Pair";
import { Consolidation } from "../models/Consolidation";
import { Opportunity } from "../models/Opportunity";
import { TrendDetectorService } from "./TrendDetectorService";
import { ConsolidationService } from "./ConsolidationService";
import { getCandlesInDateRange } from "../utils/candleUtils";
import { createLogger } from "../utils/logger";

const logger = createLogger("testing-service");

export interface TrendTestResult {
  pairId: number;
  dateRange: { startDate: Date; endDate: Date };
  isTrending: boolean;
  direction: "UP" | "DOWN" | undefined;
  adx: number | undefined;
  emaShort: number | undefined;
  emaLong: number | undefined;
  analysisTimestamp: Date;
  error?: string;
}

export interface ConsolidationTestResult {
  pairId: number;
  dateRange: { startDate: Date; endDate: Date };
  consolidations: Array<{
    startTime: Date;
    endTime: Date;
    supportLevel: number;
    resistanceLevel: number;
    durationHours: number;
  }>;
  analysisTimestamp: Date;
}

export interface ConsolidationBreakoutTestResult {
  pairId: number;
  dateRange: { startDate: Date; endDate: Date };
  trendAnalysis: TrendTestResult;
  consolidations: Array<
    Consolidation & {
      breakoutDirection?: "UP" | "DOWN";
      breakoutTimestamp?: Date;
      entryRate?: number;
      stopLossRate?: number;
      signalType?: "BUY" | "SELL";
      opportunity?: any;
    }
  >;
  opportunities: Opportunity[];
  analysisTimestamp: Date;
  error?: string;
}

export class TestingService {
  async testTrendDetection(
    pairId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TrendTestResult | { error: string }> {
    try {
      const pair = await Pair.getById(pairId);
      if (!pair) {
        return { error: "Pair not found" };
      }

      // Use the new detectTrend method for testing
      const trendDetector = new TrendDetectorService();
      const result = await trendDetector.detectTrend(
        pair,
        startDate,
        endDate,
        true // isTesting
      );

      if (!result) {
        return { error: "No result returned from trend detection" };
      }

      // Map the result to the expected TrendTestResult format
      return {
        pairId,
        dateRange: { startDate, endDate },
        isTrending: result.isTrending,
        direction: result.direction,
        adx: result.adx,
        emaShort: result.emaShort,
        emaLong: result.emaLong,
        analysisTimestamp: new Date(),
        error: result.error,
      };
    } catch (error) {
      logger.error(
        { error, pairId, startDate, endDate },
        "Error in trend detection testing"
      );
      return { error: "Analysis failed" };
    }
  }

  async testConsolidationDetection(
    pairId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ConsolidationTestResult | { error: string }> {
    try {
      const pair = await Pair.getById(pairId);
      if (!pair) {
        return { error: "Pair not found" };
      }

      // Use the new ConsolidationService for testing
      const consolidationService = new ConsolidationService();
      const analysisResult = await consolidationService.evaluatePair(
        pair,
        startDate,
        endDate,
        true // isTesting
      );

      // Map the result to the expected ConsolidationTestResult format
      let consolidations: Array<{
        startTime: Date;
        endTime: Date;
        supportLevel: number;
        resistanceLevel: number;
        qualityScore: number;
        atrRatio: number;
        durationHours: number;
      }> = [];

      if (analysisResult && analysisResult.consolidations) {
        consolidations = analysisResult.consolidations.map(
          (cons: Consolidation) => ({
            startTime: cons.startTimestamp,
            endTime: cons.endTimestamp || new Date(),
            supportLevel: cons.supportLevel,
            resistanceLevel: cons.resistanceLevel,
            qualityScore: 0, // New service doesn't use quality scores
            atrRatio: 0, // New service doesn't use ATR ratios
            durationHours: cons.endTimestamp
              ? (cons.endTimestamp.getTime() - cons.startTimestamp.getTime()) /
                (1000 * 60 * 60)
              : 0,
          })
        );
      }

      return {
        pairId,
        dateRange: { startDate, endDate },
        consolidations,
        analysisTimestamp: new Date(),
      };
    } catch (error) {
      logger.error(
        { error, pairId, startDate, endDate },
        "Error in consolidation detection testing"
      );
      return { error: "Analysis failed" };
    }
  }

  async testConsolidationBreakoutFlow(
    pairId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ConsolidationBreakoutTestResult | { error: string }> {
    const analysisTimestamp = new Date();

    try {
      logger.info(
        { pairId, startDate, endDate },
        "Starting comprehensive consolidation breakout flow test"
      );

      // 1. Get pair
      const pair = await Pair.getById(pairId);
      if (!pair) {
        return { error: "Pair not found" };
      }

      // 2. Analyze trend for the period (read-only, no DB updates)
      const trendDetector = new TrendDetectorService();
      const trendResult = await trendDetector.detectTrend(
        pair,
        startDate,
        endDate,
        true // isTesting
      );

      console.log(trendResult);

      if (!trendResult) {
        return {
          error: "Trend analysis failed",
          pairId,
          dateRange: { startDate, endDate },
          trendAnalysis: {} as TrendTestResult,
          consolidations: [],
          opportunities: [],
          analysisTimestamp,
        };
      }

      // Map trend result to TrendTestResult format
      const trendAnalysis: TrendTestResult = {
        pairId,
        dateRange: { startDate, endDate },
        isTrending: trendResult.isTrending,
        direction: trendResult.direction,
        adx: trendResult.adx,
        emaShort: trendResult.emaShort,
        emaLong: trendResult.emaLong,
        analysisTimestamp,
        error: trendResult.error,
      };

      // 3. If not trending, return early with empty consolidations/breakouts
      if (!trendResult.isTrending) {
        logger.info(
          { pairId, startDate, endDate },
          "Pair not trending in period, skipping consolidation analysis"
        );

        return {
          pairId,
          dateRange: { startDate, endDate },
          trendAnalysis,
          consolidations: [],
          opportunities: [],
          analysisTimestamp,
        };
      }

      // 4. Detect consolidations and breakouts (new unified service)
      const consolidationService = new ConsolidationService();
      const consolidationAnalysis = await consolidationService.evaluatePair(
        pair,
        startDate,
        endDate,
        true // isTesting = true, so it will create consolidations and return them
      );

      const consolidations = consolidationAnalysis?.consolidations || [];

      // 5. Get opportunities created during consolidation analysis
      // The new ConsolidationService creates opportunities automatically for matching breakouts
      const { Opportunity } = await import("../models/Opportunity");
      const { opportunities: recentOpportunities } = await Opportunity.getAll({
        pairId,
        startDate,
        endDate,
      });

      // Filter to opportunities created in the last few minutes (during this test)
      const testStartTime = new Date();
      const opportunities = recentOpportunities.filter(
        (opp: any) =>
          opp.timestamp &&
          testStartTime.getTime() - opp.timestamp.getTime() < 300000 // 5 minutes ago
      );

      // Create simplified breakout analysis for each consolidation
      const breakouts: any[] = consolidations.map((cons: Consolidation) => ({
        consolidationId: cons.id,
        breakoutDirection: cons.breakoutDirection,
        breakoutTimestamp: cons.brokenAt,
        entryRate:
          cons.breakoutDirection === "UP"
            ? cons.resistanceLevel
            : cons.supportLevel,
        stopLossRate: 0, // Simplified for testing
        signalType: cons.breakoutDirection === "UP" ? "BUY" : "SELL",
        opportunity: opportunities.find((opp: any) =>
          opp.details?.includes(`consolidation ${cons.id}`)
        ),
      }));

      // Merge breakout analysis into consolidations
      const consolidationsWithBreakouts = consolidations.map(
        (consolidation: Consolidation) => {
          const breakout = breakouts.find(
            (b: any) => b.consolidationId === consolidation.id
          );
          if (breakout) {
            return {
              ...consolidation,
              // Add breakout analysis fields
              breakoutDirection: breakout.breakoutDirection,
              breakoutTimestamp: breakout.breakoutTimestamp,
              entryRate: breakout.entryRate,
              stopLossRate: breakout.stopLossRate,
              signalType: breakout.signalType,
              opportunity: breakout.opportunity,
            };
          }
          return consolidation;
        }
      );

      logger.info(
        {
          pairId,
          startDate,
          endDate,
          consolidationsCount: consolidations.length,
          breakoutsCount: breakouts.length,
          opportunitiesCount: opportunities.length,
        },
        "Completed comprehensive consolidation breakout flow test"
      );

      return {
        pairId,
        dateRange: { startDate, endDate },
        trendAnalysis,
        consolidations: consolidationsWithBreakouts,
        opportunities,
        analysisTimestamp,
      };
    } catch (error) {
      logger.error(
        { error, pairId, startDate, endDate },
        "Error in comprehensive consolidation breakout flow test"
      );

      return {
        error: "Analysis failed",
        pairId,
        dateRange: { startDate, endDate },
        trendAnalysis: {} as TrendTestResult,
        consolidations: [],
        opportunities: [],
        analysisTimestamp,
      };
    }
  }
}
