import { Router } from "express";
import { Consolidation } from "../models/Consolidation";
import { createLogger } from "../utils/logger";

const router = Router();
const logger = createLogger("consolidations-api");

// GET / - Get consolidations with filtering
router.get("/", async (req, res) => {
  try {
    const { pair_id, start_date, end_date, status } = req.query;

    // Parse and validate parameters
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

    if (status) {
      const statusValue = status as string;
      if (!["active", "broken"].includes(statusValue)) {
        return res
          .status(400)
          .json({ error: "status must be either 'active' or 'broken'" });
      }
      filters.status = statusValue;
    }

    const consolidations = await Consolidation.getAll(filters);

    logger.info({ filters }, `Fetched ${consolidations.length} consolidations`);

    res.json({
      consolidations,
      total: consolidations.length,
    });
  } catch (error) {
    logger.error({ error }, "Error fetching consolidations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
