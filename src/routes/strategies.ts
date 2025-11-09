import { Router } from "express";
import { Strategy } from "../models/Strategy";
import { createLogger } from "../utils/logger";
import pool from "../utils/db";

const router = Router();
const logger = createLogger("strategies-api");

interface CreateStrategyRequest {
  name: string;
  active?: boolean;
}

interface UpdateStrategyRequest {
  name?: string;
  active?: boolean;
}

// GET / - Get all strategies
router.get("/", async (req, res) => {
  try {
    const strategies = await Strategy.getAll();
    res.json(strategies);
  } catch (error) {
    logger.error({ error }, "Error fetching strategies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /:id - Get strategy by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid strategy ID" });
    }

    const strategy = await Strategy.getById(id);
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    res.json(strategy);
  } catch (error) {
    logger.error({ error }, "Error fetching strategy by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST / - Create new strategy
router.post("/", async (req, res) => {
  try {
    const { name, active = true }: CreateStrategyRequest = req.body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error: "Strategy name is required and must be a non-empty string",
      });
    }

    // Check if strategy name already exists
    const existingStrategies = await Strategy.getAll();
    const nameExists = existingStrategies.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (nameExists) {
      return res.status(409).json({ error: "Strategy name already exists" });
    }

    // Create the strategy
    const newStrategy = await Strategy.create({
      name: name.trim(),
      active,
    });

    logger.info({ strategyId: newStrategy.id }, "Strategy created");
    res.status(201).json(newStrategy);
  } catch (error) {
    logger.error({ error }, "Error creating strategy");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /:id - Update strategy
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid strategy ID" });
    }

    const { name, active }: UpdateStrategyRequest = req.body;

    // Validate input
    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim().length === 0)
    ) {
      return res
        .status(400)
        .json({ error: "Strategy name must be a non-empty string" });
    }
    if (active !== undefined && typeof active !== "boolean") {
      return res.status(400).json({ error: "Active status must be a boolean" });
    }

    // Check if strategy exists
    const existingStrategy = await Strategy.getById(id);
    if (!existingStrategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    // Check if new name conflicts with existing strategies
    if (name !== undefined) {
      const allStrategies = await Strategy.getAll();
      const nameExists = allStrategies.some(
        (s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase()
      );
      if (nameExists) {
        return res.status(409).json({ error: "Strategy name already exists" });
      }
    }

    // Prepare updates
    const updates: Partial<Pick<any, "name" | "active">> = {};
    if (name !== undefined) {
      updates.name = name.trim();
    }
    if (active !== undefined) {
      updates.active = active;
    }

    const updatedStrategy = await Strategy.update(id, updates);
    if (!updatedStrategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    logger.info({ strategyId: id, updates }, "Strategy updated");
    res.json(updatedStrategy);
  } catch (error) {
    logger.error({ error }, "Error updating strategy");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:id - Delete strategy
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid strategy ID" });
    }

    // Check if strategy exists
    const strategy = await Strategy.getById(id);
    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    // Check if strategy has associated opportunities
    const opportunitiesRes = await pool.query(
      'SELECT COUNT(*) as count FROM "Opportunities" WHERE strategy_id = $1',
      [id]
    );
    const opportunitiesCount = parseInt(opportunitiesRes.rows[0].count);

    if (opportunitiesCount > 0) {
      return res.status(409).json({
        error: `Cannot delete strategy with ${opportunitiesCount} associated opportunities. Disable the strategy instead.`,
      });
    }

    // Delete the strategy
    await pool.query('DELETE FROM "Strategies" WHERE id = $1', [id]);

    logger.info({ strategyId: id }, "Strategy deleted");
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting strategy");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
