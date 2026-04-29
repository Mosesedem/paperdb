import { createHash } from "crypto";
import { sql } from "./db.js";

export interface DbContext {
  dbId: string;
  userId: string;
  permissions?: string[];
}

/** SHA-256 hash the raw API key before comparing with the stored key_hash. */
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Lightweight lookup: returns the database_id for a given API key,
 * used by legacy route middleware (docs, bulk, count, schema).
 */
export async function getDbIdFromApiKey(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.replace("Bearer ", "").trim();
  const keyHash = hashApiKey(key);

  const rows = await sql`
    SELECT database_id
    FROM api_keys
    WHERE key_hash = ${keyHash} AND revoked = FALSE
    LIMIT 1
  `;

  return rows[0]?.database_id ?? null;
}

/**
 * Full authentication: verifies API key and returns the database context,
 * used by auth, webhooks, cron, and storage route middleware.
 */
export async function authenticateApiKey(
  apiKey: string,
): Promise<DbContext | null> {
  const keyHash = hashApiKey(apiKey);

  const rows = await sql`
    SELECT k.database_id, d.owner_id, k.permissions
    FROM api_keys k
    INNER JOIN databases d ON k.database_id = d.id
    WHERE k.key_hash = ${keyHash} AND k.revoked = FALSE
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];

  // Record last usage (fire-and-forget; don't await to keep latency low)
  sql`UPDATE api_keys SET last_used = NOW() WHERE key_hash = ${keyHash}`.catch(
    () => {},
  );

  return {
    dbId: row.database_id,
    userId: row.owner_id,
    permissions: row.permissions,
  };
}
