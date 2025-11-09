import pool from "../utils/db";

export interface ConsolidationCreateParams {
  pairId: number;
  trendDirection: "UP" | "DOWN";
  startTimestamp: Date;
  endTimestamp: Date;
  resistanceLevel: number;
  supportLevel: number;
  brokenAt?: Date | null;
  breakoutDirection?: "UP" | "DOWN";
  isTrendDirection?: boolean;
}

export interface ConsolidationUpdateParams {
  trendDirection?: "UP" | "DOWN";
  startTimestamp?: Date;
  endTimestamp?: Date | null;
  resistanceLevel?: number;
  supportLevel?: number;
  brokenAt?: Date | null;
  breakoutDirection?: "UP" | "DOWN";
  isTrendDirection?: boolean;
}

export class Consolidation {
  id!: number;
  pairId!: number;
  trendDirection!: "UP" | "DOWN";
  startTimestamp!: Date;
  endTimestamp?: Date;
  resistanceLevel!: number;
  supportLevel!: number;
  brokenAt?: Date | null;
  breakoutDirection?: "UP" | "DOWN";
  isTrendDirection?: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(row: any) {
    this.id = row.id;
    this.pairId = row.pair_id;
    this.trendDirection = row.trend_direction;
    this.startTimestamp = new Date(row.start_timestamp);
    this.endTimestamp = row.end_timestamp
      ? new Date(row.end_timestamp)
      : undefined;
    this.resistanceLevel = parseFloat(row.resistance_level);
    this.supportLevel = parseFloat(row.support_level);
    this.brokenAt = row.broken_at ? new Date(row.broken_at) : undefined;
    this.breakoutDirection = row.breakout_direction;
    this.isTrendDirection = row.is_trend_direction;
    this.createdAt = new Date(row.created_at);
    this.updatedAt = new Date(row.updated_at);
  }

  static async create(
    params: ConsolidationCreateParams
  ): Promise<Consolidation> {
    const {
      pairId,
      trendDirection,
      startTimestamp,
      endTimestamp,
      resistanceLevel,
      supportLevel,
      brokenAt,
      breakoutDirection,
      isTrendDirection,
    } = params;

    const res = await pool.query(
      `INSERT INTO "Consolidations" (
        pair_id,
        trend_direction,
        start_timestamp,
        end_timestamp,
        resistance_level,
        support_level,
        broken_at,
        breakout_direction,
        is_trend_direction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        pairId,
        trendDirection,
        startTimestamp,
        endTimestamp,
        resistanceLevel,
        supportLevel,
        brokenAt ?? null,
        breakoutDirection ?? null,
        isTrendDirection ?? null,
      ]
    );

    return new Consolidation(res.rows[0]);
  }

  static async findAllByPair(pairId: number): Promise<Consolidation[]> {
    const res = await pool.query(
      `SELECT * FROM "Consolidations" WHERE pair_id = $1 ORDER BY updated_at DESC`,
      [pairId]
    );

    return res.rows.map((row) => new Consolidation(row));
  }

  static async getAllActive(): Promise<Consolidation[]> {
    const res = await pool.query(
      `SELECT * FROM "Consolidations" WHERE broken_at IS NULL`
    );

    return res.rows.map((row) => new Consolidation(row));
  }

  static async update(
    id: number,
    updates: ConsolidationUpdateParams
  ): Promise<Consolidation | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.trendDirection !== undefined) {
      fields.push(`trend_direction = $${paramIndex++}`);
      values.push(updates.trendDirection);
    }

    if (updates.startTimestamp !== undefined) {
      fields.push(`start_timestamp = $${paramIndex++}`);
      values.push(updates.startTimestamp);
    }

    if (updates.endTimestamp !== undefined) {
      fields.push(`end_timestamp = $${paramIndex++}`);
      values.push(updates.endTimestamp);
    }

    if (updates.resistanceLevel !== undefined) {
      fields.push(`resistance_level = $${paramIndex++}`);
      values.push(updates.resistanceLevel);
    }

    if (updates.supportLevel !== undefined) {
      fields.push(`support_level = $${paramIndex++}`);
      values.push(updates.supportLevel);
    }

    if (updates.brokenAt !== undefined) {
      fields.push(`broken_at = $${paramIndex++}`);
      values.push(updates.brokenAt);
    }

    if (updates.breakoutDirection !== undefined) {
      fields.push(`breakout_direction = $${paramIndex++}`);
      values.push(updates.breakoutDirection);
    }

    if (updates.isTrendDirection !== undefined) {
      fields.push(`is_trend_direction = $${paramIndex++}`);
      values.push(updates.isTrendDirection);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push(`updated_at = NOW()`);

    values.push(id);

    const query = `UPDATE "Consolidations" SET ${fields.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`;

    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      return null;
    }

    return new Consolidation(res.rows[0]);
  }

  static async getById(id: number): Promise<Consolidation | null> {
    const res = await pool.query(
      `SELECT * FROM "Consolidations" WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return new Consolidation(res.rows[0]);
  }

  static async getAll(
    filters: {
      pairId?: number;
      startDate?: Date;
      endDate?: Date;
      status?: "active" | "broken";
    } = {}
  ): Promise<Consolidation[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.pairId !== undefined) {
      conditions.push(`pair_id = $${paramIndex++}`);
      values.push(filters.pairId);
    }

    if (filters.startDate) {
      conditions.push(`start_timestamp >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`start_timestamp <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    if (filters.status) {
      if (filters.status === "active") {
        conditions.push(`broken_at IS NULL`);
      } else if (filters.status === "broken") {
        conditions.push(`broken_at IS NOT NULL`);
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `SELECT * FROM "Consolidations" ${whereClause} ORDER BY start_timestamp DESC`;

    const res = await pool.query(query, values);
    return res.rows.map((row) => new Consolidation(row));
  }
}
