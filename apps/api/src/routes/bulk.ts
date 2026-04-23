import { Hono } from "hono";
import { nanoid } from "nanoid";
import { sql } from "../lib/db.js";
import { getDbIdFromApiKey } from "../lib/auth.js";
import { validateAgainstSchema, type SchemaDefinition } from "../lib/schema.js";
import { logDbEvent } from "../lib/log-event.js";
import { publishDbEvent } from "../lib/publish-event.js";
import { createAutoIndexIfNeeded } from "../lib/create-auto-index-if-needed.js";

type Variables = {
  dbId: string;
  collection: string;
};

export const bulkRoutes = new Hono<{ Variables: Variables }>();

const SAFE_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Middleware to extract dbId and collection
bulkRoutes.use("*", async (c, next) => {
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

// POST /:collection/bulk - Bulk insert documents
bulkRoutes.post("/", async (c) => {
  const dbId = c.get("dbId");
  const collection = c.get("collection");

  try {
    const body = await c.req.json();
    const documents = Array.isArray(body)
      ? body
      : (body as { documents?: unknown[] }).documents;

    if (!Array.isArray(documents) || documents.length === 0) {
      return c.json({ error: "Invalid or empty documents array" }, 400);
    }

    // Validate each document against schema if exists
    const schemaResult = await sql`
      SELECT schema FROM collection_schema WHERE db_id = ${dbId} AND collection = ${collection}
    `;

    let parsedSchema: SchemaDefinition | null = null;
    if (schemaResult.length > 0 && schemaResult[0].schema) {
      parsedSchema =
        typeof schemaResult[0].schema === "string"
          ? JSON.parse(schemaResult[0].schema as string)
          : (schemaResult[0].schema as SchemaDefinition);
    }

    const insertedDocs: Record<string, unknown>[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      if (typeof doc !== "object" || doc === null) {
        errors.push({ index: i, error: "Document must be an object" });
        continue;
      }

      const rawDoc = doc as Record<string, unknown>;
      const { unique, key: providedKey, ...docData } = rawDoc;

      // Validate against schema
      if (parsedSchema) {
        const validation = validateAgainstSchema(
          docData as Record<string, unknown>,
          parsedSchema,
        );
        if (!validation.valid) {
          errors.push({
            index: i,
            error: validation.error || "Schema validation failed",
          });
          continue;
        }
      }

      if (Array.isArray(unique)) {
        for (const field of unique) {
          if (typeof field !== "string" || !SAFE_FIELD_NAME.test(field)) {
            errors.push({
              index: i,
              error: `Invalid unique field: ${String(field)}`,
            });
            continue;
          }

          const value = (docData as Record<string, unknown>)[field];
          if (typeof value === "undefined") continue;

          const existingRows = await sql.unsafe(
            `SELECT id FROM kv_store
             WHERE db_id = $1 AND collection = $2
             AND value->>'${field}' = $3
             LIMIT 1`,
            [dbId, collection, String(value)],
          );

          if (existingRows.length > 0) {
            errors.push({
              index: i,
              error: `Unique field violation — '${field}' already exists in this collection.`,
            });
          }
        }

        if (errors.some((entry) => entry.index === i)) {
          continue;
        }
      }

      const now = new Date().toISOString();
      const id =
        typeof providedKey === "string" && providedKey.trim().length > 0
          ? providedKey.trim()
          : nanoid();

      const storedDoc = {
        ...docData,
        _id: id,
        createdAt: now,
        updatedAt: now,
      };

      await sql`
        INSERT INTO kv_store (id, db_id, collection, key, value, created_at, updated_at)
        VALUES (${id}, ${dbId}, ${collection}, ${id}, ${JSON.stringify(storedDoc)}::jsonb, ${now}, ${now})
      `;

      insertedDocs.push(storedDoc);

      // Log event
      await logDbEvent({ dbId, collection, action: "CREATE", docId: id });

      // Publish event for real-time
      await publishDbEvent({
        dbId,
        collection,
        type: "insert",
        doc: storedDoc,
      });

      // Create auto-index if needed (for each field in the document)
      const docObj = docData as Record<string, unknown>;
      for (const field of Object.keys(docObj)) {
        await createAutoIndexIfNeeded(dbId, collection, field);
      }
    }

    return c.json({
      inserted: insertedDocs.length,
      failed: errors.length,
      documents: insertedDocs,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk insert error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
