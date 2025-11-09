import pool from "../utils/db";
import { Rate } from "./Rate";

export class Pair {
  id!: number;
  currencyId!: number; // FK to Currency
  targetCurrency!: string;
  active!: boolean;
  isTrending!: boolean;
  trendDirection?: "UP" | "DOWN";
  trendStrength?: number;
  trendDetectedAt?: Date;
  lastTrendCheck?: Date;
  currencyCode?: string; // Optional, populated in queries

  constructor(row: any) {
    this.id = row.id;
    this.currencyId = row.currency_id;
    this.targetCurrency = row.target_currency;
    this.active = row.active;
    this.isTrending = row.is_trending;
    this.trendDirection = row.trend_direction;
    this.trendStrength = row.trend_strength;
    this.trendDetectedAt = row.trend_detected_at
      ? new Date(row.trend_detected_at)
      : undefined;
    this.lastTrendCheck = row.last_trend_check
      ? new Date(row.last_trend_check)
      : undefined;
    this.currencyCode = row.currency_code;
  }

  static async getAll(): Promise<Pair[]> {
    const res = await pool.query(`
      SELECT p.id, p.currency_id, p.target_currency, p.active, p.is_trending, p.trend_direction, 
             p.trend_strength, p.trend_detected_at, p.last_trend_check, c.code as currency_code
      FROM "Pairs" p
      JOIN "Currencies" c ON p.currency_id = c.id
      ORDER BY p.id
    `);
    return res.rows.map((row) => new Pair(row));
  }

  static async getActive(): Promise<Pair[]> {
    const res = await pool.query(`
      SELECT p.id, p.currency_id, p.target_currency, p.active, p.is_trending, p.trend_direction, 
             p.trend_strength, p.trend_detected_at, p.last_trend_check, c.code as currency_code
      FROM "Pairs" p
      JOIN "Currencies" c ON p.currency_id = c.id
      WHERE p.active = true
      ORDER BY p.id
    `);
    return res.rows.map((row) => new Pair(row));
  }

  static async createOne(
    currencyId: number,
    targetCurrency: string,
    active: boolean = true
  ): Promise<Pair> {
    const res = await pool.query(
      'INSERT INTO "Pairs" (currency_id, target_currency, active) VALUES ($1, $2, $3) RETURNING *',
      [currencyId, targetCurrency, active]
    );
    return new Pair(res.rows[0]);
  }

  static async getById(id: number): Promise<Pair | null> {
    const res = await pool.query(
      `
      SELECT p.id, p.currency_id, p.target_currency, p.active, p.is_trending, p.trend_direction, 
             p.trend_strength, p.trend_detected_at, p.last_trend_check, c.code as currency_code
      FROM "Pairs" p
      JOIN "Currencies" c ON p.currency_id = c.id
      WHERE p.id = $1
    `,
      [id]
    );
    if (res.rows.length === 0) {
      return null;
    }
    return new Pair(res.rows[0]);
  }

  static async update(
    id: number,
    updates: Partial<
      Pick<
        Pair,
        | "targetCurrency"
        | "active"
        | "isTrending"
        | "trendDirection"
        | "trendStrength"
        | "trendDetectedAt"
        | "lastTrendCheck"
      >
    >
  ): Promise<Pair | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.targetCurrency !== undefined) {
      fields.push(`target_currency = $${paramIndex++}`);
      values.push(updates.targetCurrency);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }
    if (updates.isTrending !== undefined) {
      fields.push(`is_trending = $${paramIndex++}`);
      values.push(updates.isTrending);
    }
    if (updates.trendDirection !== undefined) {
      fields.push(`trend_direction = $${paramIndex++}`);
      values.push(updates.trendDirection);
    } else if (updates.isTrending === false) {
      // For non-trending pairs, explicitly set trend fields to NULL
      fields.push(`trend_direction = $${paramIndex++}`);
      values.push(null);
    }
    if (updates.trendStrength !== undefined) {
      fields.push(`trend_strength = $${paramIndex++}`);
      values.push(updates.trendStrength);
    } else if (updates.isTrending === false) {
      // For non-trending pairs, explicitly set trend fields to NULL
      fields.push(`trend_strength = $${paramIndex++}`);
      values.push(null);
    }
    if (updates.trendDetectedAt !== undefined) {
      fields.push(`trend_detected_at = $${paramIndex++}`);
      values.push(updates.trendDetectedAt);
    } else if (updates.isTrending === false) {
      // For non-trending pairs, explicitly set trend fields to NULL
      fields.push(`trend_detected_at = $${paramIndex++}`);
      values.push(null);
    }
    if (updates.lastTrendCheck !== undefined) {
      fields.push(`last_trend_check = $${paramIndex++}`);
      values.push(updates.lastTrendCheck);
    }

    if (fields.length === 0) {
      return await this.getById(id);
    }

    values.push(id);
    const query = `UPDATE "Pairs" SET ${fields.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) {
      return null;
    }
    return new Pair(res.rows[0]);
  }

  static async delete(id: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM "Pairs" WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getRatesInDateRange(startDate: Date, endDate: Date): Promise<Rate[]> {
    const res = await pool.query(
      'SELECT * FROM "Rates" WHERE pair_id = $1 AND timestamp >= $2 AND timestamp <= $3 ORDER BY timestamp ASC',
      [this.id, startDate, endDate]
    );
    return res.rows.map((row) => new Rate(row));
  }
}
