import express from "express";
import { TestingService } from "../services/TestingService";
import { createLogger } from "../utils/logger";

const router = express.Router();
const testingService = new TestingService();
const logger = createLogger("testing-routes");

// POST /api/test/trend
router.post("/trend", async (req, res) => {
  try {
    const { pairId, startDate, endDate } = req.body;

    if (!pairId || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: pairId, startDate, endDate",
      });
    }

    logger.info(
      { pairId, startDate, endDate },
      "Trend detection test requested"
    );

    const result = await testingService.testTrendDetection(
      pairId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json(result);
  } catch (error) {
    logger.error({ error, body: req.body }, "Error in trend testing endpoint");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/test/consolidation
router.post("/consolidation", async (req, res) => {
  try {
    const { pairId, startDate, endDate } = req.body;

    if (!pairId || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: pairId, startDate, endDate",
      });
    }

    logger.info(
      { pairId, startDate, endDate },
      "Consolidation detection test requested"
    );

    const result = await testingService.testConsolidationDetection(
      pairId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json(result);
  } catch (error) {
    logger.error(
      { error, body: req.body },
      "Error in consolidation testing endpoint"
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/test/consolidation-breakout
router.post("/consolidation-breakout", async (req, res) => {
  try {
    const { pairId, startDate, endDate } = req.body;

    if (!pairId || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required parameters: pairId, startDate, endDate",
      });
    }

    logger.info(
      { pairId, startDate, endDate },
      "Consolidation breakout flow test requested"
    );

    const result = await testingService.testConsolidationBreakoutFlow(
      pairId,
      new Date(startDate),
      new Date(endDate)
    );

    res.json(result);
  } catch (error) {
    logger.error(
      { error, body: req.body },
      "Error in consolidation breakout flow testing endpoint"
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
