import pool from "../utils/db";

export class Currency {
  id!: number;
  code: string;
  active: boolean;

  constructor(row: any) {
    this.id = row.id;
    this.code = row.code;
    this.active = row.active;
  }

  static async createOne(
    code: string,
    active: boolean = true
  ): Promise<Currency> {
    const res = await pool.query(
      'INSERT INTO "Currencies" (code, active) VALUES ($1, $2) RETURNING *',
      [code, active]
    );
    return new Currency(res.rows[0]);
  }

  static async getAll(): Promise<Currency[]> {
    const res = await pool.query('SELECT * FROM "Currencies" ORDER BY id');
    return res.rows.map((row) => new Currency(row));
  }

  static async getById(id: number): Promise<Currency | null> {
    const res = await pool.query('SELECT * FROM "Currencies" WHERE id = $1', [
      id,
    ]);
    if (res.rows.length === 0) {
      return null;
    }
    return new Currency(res.rows[0]);
  }

  static async update(
    id: number,
    updates: Partial<Pick<Currency, "code" | "active">>
  ): Promise<Currency | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.code !== undefined) {
      fields.push(`code = $${paramIndex++}`);
      values.push(updates.code);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) {
      // No updates provided
      return await this.getById(id);
    }

    values.push(id);
    const query = `UPDATE "Currencies" SET ${fields.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) {
      return null;
    }
    return new Currency(res.rows[0]);
  }

  static async delete(id: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM "Currencies" WHERE id = $1', [
      id,
    ]);
    return (res.rowCount ?? 0) > 0;
  }
}
