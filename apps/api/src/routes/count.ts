import { Hono } from "hono";
import { sql } from "../lib/db.js";
import { getDbIdFromApiKey } from "../lib/auth.js";

type Variables = {
  dbId: string;
  collection: string;
};

export const countRoutes = new Hono<{ Variables: Variables }>();

const SAFE_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Middleware to extract dbId and collection
countRoutes.use("*", async (c, next) => {
  const authHeader = c.req.header("authorization");
  const dbId = await getDbIdFromApiKey(authHeader ?? null);

  if (!dbId) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const collection = c.req.param("collection") ?? "";
  c.set("dbId", dbId);
  c.set("collection", collection);

  await next();
});

// GET /:collection/count - Count documents
countRoutes.get("/", async (c) => {
  const dbId = c.get("dbId");
  const collection = c.get("collection");

  try {
    const query = c.req.query();
    const filterJson = query.filter;

    const typeHints: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      const match = key.match(/^type\[([^\]]+)\]$/);
      if (match) {
        typeHints[match[1]] = value;
      }
    }

    const filters: { field: string; op: string; value: unknown }[] = [];

    // Legacy JSON filter format: ?filter={"status":"active"}
    if (filterJson) {
      const parsed = JSON.parse(filterJson) as Record<string, unknown>;
      for (const [field, value] of Object.entries(parsed)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const ops = value as Record<string, unknown>;
          for (const [op, opValue] of Object.entries(ops)) {
            const normalizedOp = op.startsWith("$") ? op.slice(1) : op;
            filters.push({ field, op: normalizedOp, value: opValue });
          }
        } else {
          filters.push({ field, op: "eq", value });
        }
      }
    }

    // SDK filter format: ?filter[field]=value or ?filter[field][gt]=1
    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith("filter[")) continue;

      const match = key.match(/^filter\[([^\]]+)\](?:\[([^\]]+)\])?$/);
      if (!match) continue;

      const field = match[1];
      const op = match[2] || "eq";
      const declaredType = typeHints[field];

      let parsedValue: unknown = value;
      if (declaredType === "boolean") {
        parsedValue = value === "true";
      } else if (declaredType === "number") {
        parsedValue = Number(value);
      } else if (value === "true") {
        parsedValue = true;
      } else if (value === "false") {
        parsedValue = false;
      }

      filters.push({ field, op, value: parsedValue });
    }

    let baseQuery =
      "SELECT COUNT(*)::int as count FROM kv_store WHERE db_id = $1 AND collection = $2";
    const args: unknown[] = [dbId, collection];
    let paramIndex = 3;

    for (const { field, op, value } of filters) {
      if (!SAFE_FIELD_NAME.test(field)) {
        continue;
      }

      if (op === "in") {
        if (!Array.isArray(value)) {
          continue;
        }

        baseQuery += ` AND value->>'${field}' = ANY($${paramIndex})`;
        args.push(value.map((entry) => String(entry)));
        paramIndex++;
        continue;
      }

      let sqlOp = "=";
      if (op === "gt") sqlOp = ">";
      else if (op === "lt") sqlOp = "<";
      else if (op === "gte") sqlOp = ">=";
      else if (op === "lte") sqlOp = "<=";
      else if (op === "ne") sqlOp = "!=";

      if (
        (op === "gt" || op === "lt" || op === "gte" || op === "lte") &&
        typeof value === "number"
      ) {
        baseQuery += ` AND (value->>'${field}')::numeric ${sqlOp} $${paramIndex}`;
        args.push(value);
      } else if ((op === "eq" || op === "ne") && typeof value === "boolean") {
        baseQuery += ` AND (value->>'${field}')::boolean ${sqlOp} $${paramIndex}`;
        args.push(value);
      } else {
        baseQuery += ` AND value->>'${field}' ${sqlOp} $${paramIndex}`;
        args.push(String(value));
      }

      paramIndex++;
    }

    const result = await sql.unsafe(baseQuery, args as any[]);
    const count = Number(result[0]?.count || 0);

    return c.json({ count });
  } catch (error) {
    console.error("Count error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
