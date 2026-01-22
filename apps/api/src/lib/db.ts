import postgres from "postgres";
import { Pool } from "pg";

// postgres.js client (for existing routes)
export const sql = postgres(process.env.DATABASE_URL!);

// pg Pool (for new routes that need more flexibility)
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}
