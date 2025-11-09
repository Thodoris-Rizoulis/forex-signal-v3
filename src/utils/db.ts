import { Pool } from "pg";
import { config } from "../config";

const pool = new Pool(config.db);

export default pool;
