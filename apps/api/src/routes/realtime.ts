import { Hono } from "hono";
import { sign } from "hono/jwt";
import { sql } from "../lib/db.js";
import { getDbIdFromApiKey } from "../lib/auth.js";

export const realtimeRoutes = new Hono();

const VALID_PERMISSIONS = ["read", "insert", "update", "delete"] as const;

function normalizeCollections(input: {
  collection?: string;
  collections?: string[];
}): string[] {
  const values: string[] = [];

  if (typeof input.collection === "string") {
    values.push(input.collection);
  }

  if (Array.isArray(input.collections)) {
    values.push(...input.collections);
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

// POST /realtime/token - Generate a JWT token for real-time subscriptions
realtimeRoutes.post("/token", async (c) => {
  const authHeader = c.req.header("authorization");
  const dbId = await getDbIdFromApiKey(authHeader ?? null);

  if (!dbId) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  try {
    const body = await c.req.json();
    const { collection, collections, permissions } = body as {
      collection?: string;
      collections?: string[];
      permissions?: string[];
    };

    const normalizedCollections = normalizeCollections({
      collection,
      collections,
    });

    if (normalizedCollections.length === 0) {
      return c.json({ error: "At least one collection is required" }, 400);
    }

    const requestedPermissions = permissions || ["read"];

    // Validate permissions
    for (const perm of requestedPermissions) {
      if (
        !VALID_PERMISSIONS.includes(perm as (typeof VALID_PERMISSIONS)[number])
      ) {
        return c.json({ error: `Invalid permission: ${perm}` }, 400);
      }
    }

    // Get the database info to verify it exists
    const dbResult = await sql`
      SELECT id FROM databases WHERE id = ${dbId}
    `;

    if (dbResult.length === 0) {
      return c.json({ error: "Database not found" }, 404);
    }

    const jwtSecret = process.env.SOCKET_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("SOCKET_SECRET/JWT_SECRET not configured");
      return c.json({ error: "Server configuration error" }, 500);
    }

    // Create JWT token with database, collections, and permissions
    const payload = {
      dbId,
      collections: normalizedCollections,
      permissions: requestedPermissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const token = await sign(payload, jwtSecret);

    return c.json({
      token,
      expiresIn: 60 * 60 * 24,
      collection: normalizedCollections[0],
      collections: normalizedCollections,
      permissions: requestedPermissions,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
