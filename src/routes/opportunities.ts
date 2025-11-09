import { Router } from "express";
import { Opportunity } from "../models/Opportunity";
import { createLogger } from "../utils/logger";

const router = Router();
const logger = createLogger("opportunities-api");

// GET / - Get opportunities with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      pair_id,
      strategy_id,
      start_date,
      end_date,
      signal_type,
      evaluation_status,
    } = req.query;

    // Parse and validate parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: "Page must be a positive integer" });
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: "Limit must be between 1 and 100" });
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
    if (strategy_id) {
      const strategyIdNum = parseInt(strategy_id as string);
      if (isNaN(strategyIdNum)) {
        return res
          .status(400)
          .json({ error: "strategy_id must be a valid integer" });
      }
      filters.strategyId = strategyIdNum;
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
    if (signal_type) {
      const signalType = signal_type as string;
      if (!["BUY", "SELL"].includes(signalType)) {
        return res
          .status(400)
          .json({ error: "signal_type must be either 'BUY' or 'SELL'" });
      }
      filters.signalType = signalType;
    }
    if (evaluation_status) {
      const evaluationStatus = evaluation_status as string;
      if (!["WIN", "LOSS", "PENDING"].includes(evaluationStatus)) {
        return res.status(400).json({
          error: "evaluation_status must be 'WIN', 'LOSS', or 'PENDING'",
        });
      }
      filters.evaluationStatus = evaluationStatus;
    }

    const options = {
      page: pageNum,
      limit: limitNum,
      ...filters,
    };

    const { opportunities, total } = await Opportunity.getAll(options);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      opportunities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    logger.error({ error }, "Error fetching opportunities");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /:id - Get opportunity by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid opportunity ID" });
    }

    const opportunity = await Opportunity.getById(id);
    if (!opportunity) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    res.json(opportunity);
  } catch (error) {
    logger.error({ error }, "Error fetching opportunity by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
