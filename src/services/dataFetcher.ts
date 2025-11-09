import axios from "axios";
import pool from "../utils/db";
import { Pair } from "../models/Pair";
import { Rate } from "../models/Rate";
import { config } from "../config";
import { createLogger } from "../utils/logger";

const logger = createLogger("dataFetcher");

interface FastForexResponse {
  results: { [key: string]: number };
}

const FETCH_INTERVAL = config.api.fetchInterval;
const API_KEY = config.api.key;

async function fetchRatesForPairs(pairs: Pair[]) {
  // Group pairs by base currency
  const grouped: Record<string, Pair[]> = pairs.reduce((acc, pair) => {
    const base = pair.currencyCode!;
    if (!acc[base]) {
      acc[base] = [];
    }
    acc[base].push(pair);
    return acc;
  }, {} as Record<string, Pair[]>);

  for (const [base, pairList] of Object.entries(grouped)) {
    try {
      const targets = pairList.map((p: Pair) => p.targetCurrency).join(",");
      const url = `https://api.fastforex.io/fetch-multi?from=${base}&to=${targets}&api_key=${API_KEY}`;
      const response = await axios.get<FastForexResponse>(url);
      const rates = response.data.results;

      // Collect rates to insert
      const ratesToInsert: { pairId: number; rate: number }[] = [];
      for (const pair of pairList) {
        const rateValue = rates[pair.targetCurrency];
        if (rateValue) {
          ratesToInsert.push({ pairId: pair.id, rate: rateValue });
          logger.info(
            `Rate collected for pair ${pair.id} (${base}-${pair.targetCurrency}): ${rateValue}`
          );
        }
      }

      // Insert all rates at once
      await Rate.createMany(ratesToInsert);
    } catch (err) {
      logger.error({ err }, `Failed to fetch rates for base ${base}`);
    }
  }
}

export async function runDataFetcher() {
  logger.info("Starting data fetcher loop");
  setInterval(async () => {
    try {
      const allPairs = await Pair.getAll();
      const pairs = allPairs.filter((p) => p.active);
      logger.info(`Fetched ${pairs.length} active pairs`);
      await fetchRatesForPairs(pairs);
      // Strategy execution will be handled by new standardized services
    } catch (err) {
      logger.error({ err }, "Error in data fetcher loop");
    }
  }, FETCH_INTERVAL * 1000);
}

// If run directly, start the fetcher
if (require.main === module) {
  runDataFetcher();
}
