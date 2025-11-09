import { Router } from "express";
import { Rate } from "../models/Rate";
import { createLogger } from "../utils/logger";

const router = Router();
const logger = createLogger("rates-api");

// GET / - Get rates with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "1000", // Higher default for chart data, but capped
      pair_id,
      start_date,
      end_date,
    } = req.query;

    // Parse and validate parameters
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 5000); // Cap at 5000 to prevent huge responses

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: "Page must be a positive integer" });
    }
    if (isNaN(limitNum) || limitNum < 1) {
      return res
        .status(400)
        .json({ error: "Limit must be a positive integer" });
    }

    // Parse optional filters
    const filters: any = {};
    if (pair_id) {
      const pairIdNum = parseInt(pair_id as string);
      if (isNaN(pairIdNum)) {
        return res
          .status(400)
          .json({ error: "pair_id must be a valid integer" });
      }
      filters.pairId = pairIdNum;
    }
    if (start_date) {
      const startDate = new Date(start_date as string);
      if (isNaN(startDate.getTime())) {
        return res
          .status(400)
          .json({ error: "start_date must be a valid ISO date string" });
      }
      filters.startDate = startDate;
    }
    if (end_date) {
      const endDate = new Date(end_date as string);
      if (isNaN(endDate.getTime())) {
        return res
          .status(400)
          .json({ error: "end_date must be a valid ISO date string" });
      }
      filters.endDate = endDate;
    }

    const options = {
      page: pageNum,
      limit: limitNum,
      ...filters,
    };

    const { rates, total } = await Rate.getAll(options);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Add performance warning for large datasets
    const performanceWarning =
      total > 10000
        ? "Warning: Large dataset detected. Consider using smaller date ranges or higher pagination limits for better performance."
        : null;

    res.json({
      rates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      ...(performanceWarning && { warning: performanceWarning }),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching rates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /timeseries/:pairId - Optimized endpoint for chart data
router.get("/timeseries/:pairId", async (req, res) => {
  try {
    const pairId = parseInt(req.params.pairId);
    if (isNaN(pairId)) {
      return res.status(400).json({ error: "Invalid pair ID" });
    }

    const { start_date, end_date, interval = "1h", limit = "1000" } = req.query;

    const limitNum = Math.min(parseInt(limit as string), 5000); // Cap at 5000

    // Parse optional filters
    const options: any = { limit: limitNum, interval };
    if (start_date) {
      const startDate = new Date(start_date as string);
      if (isNaN(startDate.getTime())) {
        return res
          .status(400)
          .json({ error: "start_date must be a valid ISO date string" });
      }
      options.startDate = startDate;
    }
    if (end_date) {
      const endDate = new Date(end_date as string);
      if (isNaN(endDate.getTime())) {
        return res
          .status(400)
          .json({ error: "end_date must be a valid ISO date string" });
      }
      options.endDate = endDate;
    }

    const rates = await Rate.getTimeSeries(pairId, options);

    // Add performance warning for large datasets
    const performanceWarning =
      rates.length >= limitNum
        ? `Warning: Result limited to ${limitNum} data points. Consider using smaller date ranges for better performance.`
        : null;

    res.json({
      pairId,
      rates,
      count: rates.length,
      ...(performanceWarning && { warning: performanceWarning }),
    });
  } catch (error) {
    logger.error({ error }, "Error fetching time series rates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /:id - Get rate by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid rate ID" });
    }

    const rate = await Rate.getById(id);
    if (!rate) {
      return res.status(404).json({ error: "Rate not found" });
    }

    res.json(rate);
  } catch (error) {
    logger.error({ error }, "Error fetching rate by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST / - Create a new rate
router.post("/", async (req, res) => {
  try {
    const { pairId, rate } = req.body;

    if (!pairId || typeof pairId !== "number") {
      return res
        .status(400)
        .json({ error: "pairId is required and must be a number" });
    }

    if (!rate || typeof rate !== "number") {
      return res
        .status(400)
        .json({ error: "rate is required and must be a number" });
    }

    const newRate = await Rate.createOne(pairId, rate);
    logger.info({ rateId: newRate.id }, "Rate created");

    res.status(201).json(newRate);
  } catch (error) {
    logger.error({ error }, "Error creating rate");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
