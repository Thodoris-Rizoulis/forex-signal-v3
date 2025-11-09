import { Router } from "express";
import { Pair } from "../models/Pair";
import { Currency } from "../models/Currency";
import { createLogger } from "../utils/logger";
import pool from "../utils/db";

const router = Router();
const logger = createLogger("pairs-api");

interface CreatePairRequest {
  currencyId: number;
  targetCurrency: string;
  active?: boolean;
}

interface UpdatePairRequest {
  targetCurrency?: string;
  active?: boolean;
}

// GET / - Get all pairs
router.get("/", async (req, res) => {
  try {
    const pairs = await Pair.getAll();
    res.json(pairs);
  } catch (error) {
    logger.error({ error }, "Error fetching pairs");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /:id - Get pair by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid pair ID" });
    }

    const pair = await Pair.getById(id);
    if (!pair) {
      return res.status(404).json({ error: "Pair not found" });
    }

    res.json(pair);
  } catch (error) {
    logger.error({ error }, "Error fetching pair by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST / - Create new pair
router.post("/", async (req, res) => {
  try {
    const {
      currencyId,
      targetCurrency,
      active = true,
    }: CreatePairRequest = req.body;

    // Validate required fields
    if (!currencyId || typeof currencyId !== "number") {
      return res
        .status(400)
        .json({ error: "currencyId is required and must be a number" });
    }
    if (
      !targetCurrency ||
      typeof targetCurrency !== "string" ||
      targetCurrency.trim().length === 0
    ) {
      return res.status(400).json({
        error: "targetCurrency is required and must be a non-empty string",
      });
    }

    // Validate that the referenced currency exists
    const currency = await Currency.getById(currencyId);
    if (!currency) {
      return res
        .status(400)
        .json({ error: "Referenced currency does not exist" });
    }

    // Check if pair already exists (same currency and target currency)
    const allPairs = await Pair.getAll();
    const pairExists = allPairs.some(
      (p) =>
        p.currencyId === currencyId &&
        p.targetCurrency.toLowerCase() === targetCurrency.toLowerCase()
    );
    if (pairExists) {
      return res.status(409).json({
        error: "Pair with this currency and target currency already exists",
      });
    }

    const pair = await Pair.createOne(
      currencyId,
      targetCurrency.trim().toUpperCase(),
      active
    );
    logger.info({ pairId: pair.id }, "Pair created");
    res.status(201).json(pair);
  } catch (error) {
    logger.error({ error }, "Error creating pair");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /:id - Update pair
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid pair ID" });
    }

    const { targetCurrency, active }: UpdatePairRequest = req.body;

    // Validate input
    if (
      targetCurrency !== undefined &&
      (typeof targetCurrency !== "string" || targetCurrency.trim().length === 0)
    ) {
      return res
        .status(400)
        .json({ error: "targetCurrency must be a non-empty string" });
    }

    // Check if pair exists
    const existingPair = await Pair.getById(id);
    if (!existingPair) {
      return res.status(404).json({ error: "Pair not found" });
    }

    // Check if new target currency conflicts with existing pairs for the same currency
    if (targetCurrency !== undefined) {
      const allPairs = await Pair.getAll();
      const targetExists = allPairs.some(
        (p) =>
          p.id !== id &&
          p.currencyId === existingPair.currencyId &&
          p.targetCurrency.toLowerCase() === targetCurrency.toLowerCase()
      );
      if (targetExists) {
        return res.status(409).json({
          error:
            "Another pair with this currency and target currency already exists",
        });
      }
    }

    // Prepare updates
    const updates: Partial<Pick<Pair, "targetCurrency" | "active">> = {};
    if (targetCurrency !== undefined) {
      updates.targetCurrency = targetCurrency.trim().toUpperCase();
    }
    if (active !== undefined) {
      updates.active = active;
    }

    const updatedPair = await Pair.update(id, updates);
    if (!updatedPair) {
      return res.status(404).json({ error: "Pair not found" });
    }

    logger.info({ pairId: id, updates }, "Pair updated");
    res.json(updatedPair);
  } catch (error) {
    logger.error({ error }, "Error updating pair");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:id - Delete pair
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid pair ID" });
    }

    // Check if pair exists
    const pair = await Pair.getById(id);
    if (!pair) {
      return res.status(404).json({ error: "Pair not found" });
    }

    // Check for related records that would prevent deletion
    const ratesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM "Rates" WHERE pair_id = $1',
      [id]
    );
    const opportunitiesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM "Opportunities" WHERE pair_id = $1',
      [id]
    );

    const ratesCount = parseInt(ratesCheck.rows[0].count);
    const opportunitiesCount = parseInt(opportunitiesCheck.rows[0].count);

    if (ratesCount > 0 || opportunitiesCount > 0) {
      return res.status(409).json({
        error: `Cannot delete pair with associated data. ${ratesCount} rates and ${opportunitiesCount} opportunities found. Deactivate the pair instead.`,
      });
    }

    const deleted = await Pair.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Pair not found" });
    }

    logger.info({ pairId: id }, "Pair deleted");
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting pair");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
