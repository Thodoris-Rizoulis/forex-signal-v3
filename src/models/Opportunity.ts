import pool from "../utils/db";
import { webSocketService } from "../services/webSocketService";

export class Opportunity {
  id: number;
  pairId: number; // FK to Pair
  strategyId: number; // FK to Strategy
  consolidationId: number | null; // FK to Consolidation
  details: string;
  timestamp: Date;
  evaluation: number | null; // 0=loss, 1=win, null=pending
  evaluationAt: Date | null;
  entryRate: number | null;
  stopLossRate: number | null;
  takeProfitRate: number | null;
  evaluationPrice: number | null;
  pnlAmount: number | null;
  signalType: "BUY" | "SELL";

  constructor(row: any) {
    this.id = row.id;
    this.pairId = row.pair_id;
    this.strategyId = row.strategy_id;
    this.consolidationId = row.consolidation_id;
    this.details = row.details;
    this.timestamp = new Date(row.timestamp);
    this.evaluation = row.evaluation;
    this.evaluationAt = row.evaluation_at ? new Date(row.evaluation_at) : null;
    this.entryRate = row.entry_rate ? parseFloat(row.entry_rate) : null;
    this.stopLossRate = row.stop_loss_rate
      ? parseFloat(row.stop_loss_rate)
      : null;
    this.takeProfitRate = row.take_profit_rate
      ? parseFloat(row.take_profit_rate)
      : null;
    this.evaluationPrice = row.evaluation_price
      ? parseFloat(row.evaluation_price)
      : null;
    this.pnlAmount = row.pnl_amount ? parseFloat(row.pnl_amount) : null;
    this.signalType = row.signal_type;
  }

  static async createOne(
    pairId: number,
    strategyId: number,
    consolidationId: number | null,
    details: string,
    entryRate?: number,
    stopLossRate?: number,
    takeProfitRate?: number,
    pnlAmount?: number,
    signalType?: "BUY" | "SELL"
  ): Promise<Opportunity> {
    const res = await pool.query(
      'INSERT INTO "Opportunities" (pair_id, strategy_id, consolidation_id, details, entry_rate, stop_loss_rate, take_profit_rate, pnl_amount, signal_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        pairId,
        strategyId,
        consolidationId,
        details,
        entryRate,
        stopLossRate,
        takeProfitRate,
        pnlAmount,
        signalType,
      ]
    );
    const opportunity = new Opportunity(res.rows[0]);

    // Broadcast the new opportunity via WebSocket
    try {
      webSocketService.broadcastOpportunity({
        id: opportunity.id,
        pairId: opportunity.pairId,
        strategyId: opportunity.strategyId,
        consolidationId: opportunity.consolidationId,
        details: opportunity.details,
        timestamp: opportunity.timestamp,
        evaluation: opportunity.evaluation,
        evaluationAt: opportunity.evaluationAt,
        entryRate: opportunity.entryRate,
        stopLossRate: opportunity.stopLossRate,
        takeProfitRate: opportunity.takeProfitRate,
        evaluationPrice: opportunity.evaluationPrice,
        pnlAmount: opportunity.pnlAmount,
        signalType: opportunity.signalType,
      });
    } catch (error) {
      // Log error but don't fail the opportunity creation
      console.error("Failed to broadcast opportunity via WebSocket:", error);
    }

    return opportunity;
  }

  static async getAll(
    options: {
      page?: number;
      limit?: number;
      pairId?: number;
      strategyId?: number;
      startDate?: Date;
      endDate?: Date;
      signalType?: "BUY" | "SELL";
      evaluationStatus?: "WIN" | "LOSS" | "PENDING";
    } = {}
  ): Promise<{ opportunities: Opportunity[]; total: number }> {
    const {
      page = 1,
      limit = 50,
      pairId,
      strategyId,
      startDate,
      endDate,
      signalType,
      evaluationStatus,
    } = options;

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (pairId !== undefined) {
      conditions.push(`o.pair_id = $${paramIndex++}`);
      params.push(pairId);
    }
    if (strategyId !== undefined) {
      conditions.push(`o.strategy_id = $${paramIndex++}`);
      params.push(strategyId);
    }
    if (startDate) {
      conditions.push(`o.timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`o.timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }
    if (signalType) {
      if (signalType === "BUY") {
        conditions.push(`o.details ILIKE $${paramIndex++}`);
        params.push("%buy%");
      } else if (signalType === "SELL") {
        conditions.push(`o.details ILIKE $${paramIndex++}`);
        params.push("%sell%");
      }
    }
    if (evaluationStatus) {
      if (evaluationStatus === "WIN") {
        conditions.push(`o.evaluation = $${paramIndex++}`);
        params.push(1);
      } else if (evaluationStatus === "LOSS") {
        conditions.push(`o.evaluation = $${paramIndex++}`);
        params.push(0);
      } else if (evaluationStatus === "PENDING") {
        conditions.push(`o.evaluation IS NULL`);
      }
    } else {
      // Default to only evaluated opportunities (not pending) for History page
      conditions.push(`o.evaluation IS NOT NULL`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Opportunities" o ${whereClause}`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total);

    // Get paginated results with joins for related data
    const offset = (page - 1) * limit;
    const limitParamIndex = paramIndex++;
    const offsetParamIndex = paramIndex++;
    params.push(limit, offset);

    const dataQuery = `
      SELECT
        o.id, o.pair_id, o.strategy_id, o.consolidation_id, o.details, o.timestamp,
        o.evaluation, o.evaluation_at, o.entry_rate, o.stop_loss_rate, o.take_profit_rate, o.evaluation_price, o.pnl_amount,
        p.target_currency as pair_target_currency,
        c.code as currency_code,
        s.name as strategy_name,
        cons.resistance_level as consolidation_resistance,
        cons.support_level as consolidation_support
      FROM "Opportunities" o
      JOIN "Pairs" p ON o.pair_id = p.id
      JOIN "Currencies" c ON p.currency_id = c.id
      JOIN "Strategies" s ON o.strategy_id = s.id
      LEFT JOIN "Consolidations" cons ON o.consolidation_id = cons.id
      ${whereClause}
      ORDER BY o.timestamp DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const dataRes = await pool.query(dataQuery, params);
    const opportunities = dataRes.rows.map((row) => ({
      ...new Opportunity(row),
      pair: {
        targetCurrency: row.pair_target_currency,
        currencyCode: row.currency_code,
      },
      strategy: {
        name: row.strategy_name,
      },
      consolidation: row.consolidation_resistance
        ? {
            resistance: parseFloat(row.consolidation_resistance),
            support: parseFloat(row.consolidation_support),
          }
        : undefined,
    }));

    return { opportunities, total };
  }

  static async getById(id: number): Promise<Opportunity | null> {
    const res = await pool.query(
      `
      SELECT
        o.id, o.pair_id, o.strategy_id, o.consolidation_id, o.details, o.timestamp,
        o.evaluation, o.evaluation_at, o.entry_rate, o.stop_loss_rate, o.take_profit_rate, o.evaluation_price, o.pnl_amount,
        p.target_currency as pair_target_currency,
        c.code as currency_code,
        s.name as strategy_name,
        cons.resistance_level as consolidation_resistance,
        cons.support_level as consolidation_support
      FROM "Opportunities" o
      JOIN "Pairs" p ON o.pair_id = p.id
      JOIN "Currencies" c ON p.currency_id = c.id
      JOIN "Strategies" s ON o.strategy_id = s.id
      LEFT JOIN "Consolidations" cons ON o.consolidation_id = cons.id
      WHERE o.id = $1
    `,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const opportunity = new Opportunity(row);
    // Add related data
    (opportunity as any).pair = {
      targetCurrency: row.pair_target_currency,
      currencyCode: row.currency_code,
    };
    (opportunity as any).strategy = {
      name: row.strategy_name,
    };
    (opportunity as any).consolidation = row.consolidation_resistance
      ? {
          resistance: parseFloat(row.consolidation_resistance),
          support: parseFloat(row.consolidation_support),
        }
      : undefined;

    return opportunity;
  }

  static async findUnevaluatedByStrategyAndPair(
    strategyId: number,
    pairId: number
  ): Promise<Opportunity | null> {
    const res = await pool.query(
      'SELECT * FROM "Opportunities" WHERE strategy_id = $1 AND pair_id = $2 AND evaluation IS NULL LIMIT 1',
      [strategyId, pairId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return new Opportunity(res.rows[0]);
  }
}
