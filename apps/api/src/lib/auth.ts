import { sql } from "./db.js";
import { getPool } from "./db.js";

export async function getDbIdFromApiKey(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.replace("Bearer ", "").trim();

  const result = await sql`
    SELECT T1.user_id, T1.db_id
    FROM api_keys AS T1
    INNER JOIN databases AS T2 ON T1.db_id = T2.id
    WHERE T1.key = ${key} AND T1.revoked = 0 AND T2.deleted_at IS NULL
  `;

  const row = result[0];
  return row?.db_id || null;
}

// New function for authenticating API keys and returning full context
export interface DbContext {
  dbId: string;
  userId: string;
  keyType?: string;
  permissions?: string[];
}

export async function authenticateApiKey(
  apiKey: string,
): Promise<DbContext | null> {
  const pool = getPool();

  const result = await pool.query(
    `SELECT T1.user_id, T1.db_id, T1.key_type, T1.permissions
     FROM api_keys AS T1
     INNER JOIN databases AS T2 ON T1.db_id = T2.id
     WHERE T1.key = $1 AND T1.revoked = 0 AND T2.deleted_at IS NULL`,
    [apiKey],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    dbId: row.db_id,
    userId: row.user_id,
    keyType: row.key_type,
    permissions: row.permissions,
  };
}
