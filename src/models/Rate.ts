import pool from "../utils/db";

export class Rate {
  id!: number;
  pairId!: number; // FK to Pair
  rate!: number;
  timestamp!: Date;

  constructor(row: any) {
    this.id = row.id;
    this.pairId = row.pair_id;
    this.rate = row.rate;
    this.timestamp = new Date(row.timestamp);
  }

  static async createOne(pairId: number, rate: number): Promise<Rate> {
    const res = await pool.query(
      'INSERT INTO "Rates" (pair_id, rate, timestamp) VALUES ($1, $2, NOW()) RETURNING *',
      [pairId, rate]
    );
    return new Rate(res.rows[0]);
  }

  static async createMany(
    rates: { pairId: number; rate: number }[]
  ): Promise<Rate[]> {
    if (rates.length === 0) return [];
    const values = rates
      .map((r, i) => `($${i * 2 + 1}, $${i * 2 + 2}, NOW())`)
      .join(", ");
    const params = rates.flatMap((r) => [r.pairId, r.rate]);
    const res = await pool.query(
      `INSERT INTO "Rates" (pair_id, rate, timestamp) VALUES ${values} RETURNING *`,
      params
    );
    return res.rows.map((row) => new Rate(row));
  }

  static async getAll(
    options: {
      page?: number;
      limit?: number;
      pairId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ rates: Rate[]; total: number }> {
    const { page = 1, limit = 1000, pairId, startDate, endDate } = options;

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (pairId !== undefined) {
      conditions.push(`r.pair_id = $${paramIndex++}`);
      params.push(pairId);
    }
    if (startDate) {
      conditions.push(`r.timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`r.timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM "Rates" r ${whereClause}`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total);

    // Get paginated results with joins for related data
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const dataQuery = `
      SELECT
        r.id, r.pair_id, r.rate, r.timestamp,
        p.target_currency as pair_target_currency,
        c.code as currency_code
      FROM "Rates" r
      JOIN "Pairs" p ON r.pair_id = p.id
      JOIN "Currencies" c ON p.currency_id = c.id
      ${whereClause}
      ORDER BY r.timestamp DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataRes = await pool.query(dataQuery, params);
    const rates = dataRes.rows.map((row) => ({
      ...new Rate(row),
      pair: {
        targetCurrency: row.pair_target_currency,
        currencyCode: row.currency_code,
      },
    }));

    return { rates, total };
  }

  static async getById(id: number): Promise<Rate | null> {
    const res = await pool.query(
      `
      SELECT
        r.id, r.pair_id, r.rate, r.timestamp,
        p.target_currency as pair_target_currency,
        c.code as currency_code
      FROM "Rates" r
      JOIN "Pairs" p ON r.pair_id = p.id
      JOIN "Currencies" c ON p.currency_id = c.id
      WHERE r.id = $1
    `,
      [id]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const rate = new Rate(row);
    // Add related data
    (rate as any).pair = {
      targetCurrency: row.pair_target_currency,
      currencyCode: row.currency_code,
    };

    return rate;
  }

  static async getTimeSeries(
    pairId: number,
    options: {
      startDate?: Date;
      endDate?: Date;
      interval?: "1m" | "5m" | "15m" | "1h" | "1d";
      limit?: number;
    } = {}
  ): Promise<Rate[]> {
    const { startDate, endDate, interval = "1h", limit = 1000 } = options;

    // Build WHERE conditions
    const conditions = ["r.pair_id = $1"];
    const params: any[] = [pairId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`r.timestamp >= $${paramIndex++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`r.timestamp <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.join(" AND ");

    // For time-series optimization, aggregate by time intervals
    params.push(limit);
    let query = "";
    console.log(
      "getTimeSeries called with interval:",
      interval,
      "pairId:",
      pairId
    );
    if (interval === "1h") {
      query = `
        SELECT
          DATE_TRUNC('hour', r.timestamp) as period,
          (ARRAY_AGG(r.rate ORDER BY r.timestamp ASC))[1] as open,
          MAX(r.rate) as high,
          MIN(r.rate) as low,
          (ARRAY_AGG(r.rate ORDER BY r.timestamp DESC))[1] as close,
          MAX(r.timestamp) as timestamp,
          MIN(r.id) as id,
          r.pair_id,
          p.target_currency as pair_target_currency,
          c.code as currency_code
        FROM "Rates" r
        JOIN "Pairs" p ON r.pair_id = p.id
        JOIN "Currencies" c ON p.currency_id = c.id
        WHERE ${whereClause}
        GROUP BY DATE_TRUNC('hour', r.timestamp), r.pair_id, p.target_currency, c.code
        ORDER BY period DESC
        LIMIT $${paramIndex}
      `;
    } else if (interval === "1d") {
      query = `
        SELECT
          DATE_TRUNC('day', r.timestamp) as period,
          (ARRAY_AGG(r.rate ORDER BY r.timestamp ASC))[1] as open,
          MAX(r.rate) as high,
          MIN(r.rate) as low,
          (ARRAY_AGG(r.rate ORDER BY r.timestamp DESC))[1] as close,
          MAX(r.timestamp) as timestamp,
          MIN(r.id) as id,
          r.pair_id,
          p.target_currency as pair_target_currency,
          c.code as currency_code
        FROM "Rates" r
        JOIN "Pairs" p ON r.pair_id = p.id
        JOIN "Currencies" c ON p.currency_id = c.id
        WHERE ${whereClause}
        GROUP BY DATE_TRUNC('day', r.timestamp), r.pair_id, p.target_currency, c.code
        ORDER BY period DESC
        LIMIT $${paramIndex}
      `;
    } else {
      query = `
        SELECT
          r.id, r.pair_id, r.rate, r.timestamp,
          p.target_currency as pair_target_currency,
          c.code as currency_code
        FROM "Rates" r
        JOIN "Pairs" p ON r.pair_id = p.id
        JOIN "Currencies" c ON p.currency_id = c.id
        WHERE ${whereClause}
        ORDER BY r.timestamp DESC
        LIMIT $${paramIndex}
      `;
    }

    const res = await pool.query(query, params);
    return res.rows.map((row) => {
      const rate = new Rate(row);
      (rate as any).pair = {
        targetCurrency: row.pair_target_currency,
        currencyCode: row.currency_code,
      };
      // For aggregated data, add OHLC fields
      if (row.open !== undefined) {
        (rate as any).open = row.open;
        (rate as any).high = row.high;
        (rate as any).low = row.low;
        (rate as any).close = row.close;
      }
      return rate;
    });
  }
}
