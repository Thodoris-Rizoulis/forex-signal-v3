import pool from "../utils/db";

export class Strategy {
  id: number;
  name: string;
  active: boolean;

  constructor(row: any) {
    this.id = row.id;
    this.name = row.name;
    this.active = row.active;
  }

  static async getAll(): Promise<any[]> {
    const res = await pool.query('SELECT * FROM "Strategies" ORDER BY id');
    return res.rows;
  }

  static async findByName(name: string): Promise<any | null> {
    const res = await pool.query(
      'SELECT * FROM "Strategies" WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [name]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0];
  }

  static async create(params: {
    name: string;
    active?: boolean;
  }): Promise<any> {
    const { name, active = true } = params;

    const res = await pool.query(
      'INSERT INTO "Strategies" (name, active) VALUES ($1, $2) RETURNING *',
      [name, active]
    );

    return res.rows[0];
  }

  static async getById(id: number): Promise<any | null> {
    const res = await pool.query('SELECT * FROM "Strategies" WHERE id = $1', [
      id,
    ]);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }

  static async update(
    id: number,
    updates: Partial<Pick<any, "name" | "active">>
  ): Promise<any | null> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }

    if (fields.length === 0) {
      return await this.getById(id);
    }

    values.push(id);
    const query = `UPDATE "Strategies" SET ${fields.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING *`;

    const res = await pool.query(query, values);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  }
}
