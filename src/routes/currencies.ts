import { Router } from "express";
import axios from "axios";
import { Currency } from "../models/Currency";
import { Pair } from "../models/Pair";
import { createLogger } from "../utils/logger";
import { config } from "../config";

const router = Router();
const logger = createLogger("currencies-api");

interface CreateCurrencyRequest {
  code: string;
  active?: boolean;
}

interface UpdateCurrencyRequest {
  code?: string;
  active?: boolean;
}

// GET /currencies - Get all currencies
router.get("/", async (req, res) => {
  try {
    const currencies = await Currency.getAll();
    res.json(currencies);
  } catch (error) {
    logger.error({ error }, "Error fetching currencies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /currencies/available - Get available currencies from FastForex
router.get("/available", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.fastforex.io/currencies?api_key=${config.api.key}`
    );
    res.json(response.data);
  } catch (error) {
    logger.error({ error }, "Error fetching available currencies");
    res.status(500).json({ error: "Failed to fetch available currencies" });
  }
});

// GET /currencies/:id - Get currency by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid currency ID" });
    }

    const currency = await Currency.getById(id);
    if (!currency) {
      return res.status(404).json({ error: "Currency not found" });
    }

    res.json(currency);
  } catch (error) {
    logger.error({ error }, "Error fetching currency by ID");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /currencies - Create new currency
router.post("/", async (req, res) => {
  try {
    const { code, active = true }: CreateCurrencyRequest = req.body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return res.status(400).json({
        error: "Currency code is required and must be a non-empty string",
      });
    }

    // Check if currency code already exists
    const existingCurrencies = await Currency.getAll();
    const codeExists = existingCurrencies.some(
      (c) => c.code.toLowerCase() === code.toLowerCase()
    );
    if (codeExists) {
      return res.status(409).json({ error: "Currency code already exists" });
    }

    const currency = await Currency.createOne(
      code.trim().toUpperCase(),
      active
    );
    logger.info({ currencyId: currency.id }, "Currency created");
    res.status(201).json(currency);
  } catch (error) {
    logger.error({ error }, "Error creating currency");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /currencies/:id - Update currency
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid currency ID" });
    }

    const { code, active }: UpdateCurrencyRequest = req.body;

    // Validate input
    if (
      code !== undefined &&
      (typeof code !== "string" || code.trim().length === 0)
    ) {
      return res
        .status(400)
        .json({ error: "Currency code must be a non-empty string" });
    }

    // Check if currency exists
    const existingCurrency = await Currency.getById(id);
    if (!existingCurrency) {
      return res.status(404).json({ error: "Currency not found" });
    }

    // Check if new code conflicts with existing currencies
    if (code !== undefined) {
      const allCurrencies = await Currency.getAll();
      const codeExists = allCurrencies.some(
        (c) => c.id !== id && c.code.toLowerCase() === code.toLowerCase()
      );
      if (codeExists) {
        return res.status(409).json({ error: "Currency code already exists" });
      }
    }

    // Prepare updates
    const updates: Partial<Pick<Currency, "code" | "active">> = {};
    if (code !== undefined) {
      updates.code = code.trim().toUpperCase();
    }
    if (active !== undefined) {
      updates.active = active;
    }

    const updatedCurrency = await Currency.update(id, updates);
    if (!updatedCurrency) {
      return res.status(404).json({ error: "Currency not found" });
    }

    // Business logic: If disabling currency, disable all associated pairs
    if (active === false && existingCurrency.active !== false) {
      try {
        // Get all pairs for this currency
        const pairs = await Pair.getAll();
        const currencyPairs = pairs.filter((p) => p.currencyId === id);

        // Disable all associated pairs
        for (const pair of currencyPairs) {
          if (pair.active) {
            await Pair.update(pair.id, { active: false });
            logger.info(
              { pairId: pair.id, currencyId: id },
              "Pair disabled due to currency deactivation"
            );
          }
        }

        if (currencyPairs.length > 0) {
          logger.info(
            { currencyId: id, pairsDisabled: currencyPairs.length },
            "All associated pairs disabled"
          );
        }
      } catch (pairError) {
        logger.error(
          { error: pairError, currencyId: id },
          "Error disabling associated pairs"
        );
        // Don't fail the currency update if pair update fails
      }
    }

    logger.info({ currencyId: id, updates }, "Currency updated");
    res.json(updatedCurrency);
  } catch (error) {
    logger.error({ error }, "Error updating currency");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /currencies/:id - Delete currency
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid currency ID" });
    }

    // Check if currency exists
    const currency = await Currency.getById(id);
    if (!currency) {
      return res.status(404).json({ error: "Currency not found" });
    }

    // Check if currency has associated pairs
    const pairs = await Pair.getAll();
    const hasPairs = pairs.some((p) => p.currencyId === id);
    if (hasPairs) {
      return res.status(409).json({
        error:
          "Cannot delete currency with associated pairs. Disable the currency instead.",
      });
    }

    const deleted = await Currency.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Currency not found" });
    }

    logger.info({ currencyId: id }, "Currency deleted");
    res.status(204).send();
  } catch (error) {
    logger.error({ error }, "Error deleting currency");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
