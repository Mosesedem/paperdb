/**
 * Webhooks API Routes
 * CRUD operations for webhooks and delivery management
 */
import { Hono, Context } from "hono";
import { nanoid } from "nanoid";
import { createHmac, randomBytes } from "crypto";
import { getPool } from "../lib/db.js";
import { authenticateApiKey, DbContext } from "../lib/auth.js";
import { getRedis } from "../lib/redis.js";

type Variables = {
  dbContext: DbContext;
};

export const webhookRoutes = new Hono<{ Variables: Variables }>();

// Generate webhook signing secret
function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

// Create webhook signature
function createSignature(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  return `sha256=${hmac.digest("hex")}`;
}

// Middleware to authenticate API key
webhookRoutes.use("*", async (c, next) => {
  const apiKey =
    c.req.header("Authorization")?.replace("Bearer ", "") ||
    c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "API key required" }, 401);
  }

  const dbContext = await authenticateApiKey(apiKey);
  if (!dbContext) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("dbContext", dbContext);
  await next();
});

/**
 * GET /webhooks
 * List all webhooks for the database
 */
webhookRoutes.get("/", async (c) => {
  const { dbId } = c.get("dbContext");
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, url, events, collections, enabled, description, created_at, updated_at
     FROM webhooks WHERE database_id = $1 ORDER BY created_at DESC`,
    [dbId],
  );

  return c.json(
    result.rows.map((row: any) => ({
      id: row.id,
      url: row.url,
      events: row.events,
      collections: row.collections,
      enabled: row.enabled,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  );
});

/**
 * POST /webhooks
 * Create a new webhook
 */
webhookRoutes.post("/", async (c) => {
  const { dbId } = c.get("dbContext");
  const body = await c.req.json();
  const {
    url,
    events,
    collections,
    description,
    enabled = true,
    headers = {},
  } = body;

  if (!url) {
    return c.json({ error: "URL is required" }, 400);
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    return c.json({ error: "At least one event is required" }, 400);
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  const pool = getPool();
  const id = nanoid();
  const secret = generateWebhookSecret();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO webhooks (id, database_id, url, events, collections, secret, enabled, description, headers, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
    [
      id,
      dbId,
      url,
      events,
      collections || null,
      secret,
      enabled,
      description || null,
      JSON.stringify(headers),
      now,
    ],
  );

  return c.json(
    {
      id,
      url,
      events,
      collections: collections || "*",
      secret,
      enabled,
      description,
      createdAt: now,
      updatedAt: now,
    },
    201,
  );
});

/**
 * GET /webhooks/:id
 * Get a webhook by ID
 */
webhookRoutes.get("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, url, events, collections, secret, enabled, description, headers, created_at, updated_at
     FROM webhooks WHERE id = $1 AND database_id = $2`,
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  const webhook = result.rows[0];
  return c.json({
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    collections: webhook.collections || "*",
    secret: webhook.secret,
    enabled: webhook.enabled,
    description: webhook.description,
    headers: webhook.headers,
    createdAt: webhook.created_at,
    updatedAt: webhook.updated_at,
  });
});

/**
 * PATCH /webhooks/:id
 * Update a webhook
 */
webhookRoutes.patch("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { url, events, collections, enabled, description, headers } = body;

  const pool = getPool();

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (url !== undefined) {
    try {
      new URL(url);
    } catch {
      return c.json({ error: "Invalid URL" }, 400);
    }
    updates.push(`url = $${paramIndex++}`);
    values.push(url);
  }
  if (events !== undefined) {
    updates.push(`events = $${paramIndex++}`);
    values.push(events);
  }
  if (collections !== undefined) {
    updates.push(`collections = $${paramIndex++}`);
    values.push(collections === "*" ? null : collections);
  }
  if (enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(enabled);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (headers !== undefined) {
    updates.push(`headers = $${paramIndex++}`);
    values.push(JSON.stringify(headers));
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id, dbId);

  const result = await pool.query(
    `UPDATE webhooks SET ${updates.join(", ")}
     WHERE id = $${paramIndex++} AND database_id = $${paramIndex}
     RETURNING id, url, events, collections, enabled, description, created_at, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  const webhook = result.rows[0];
  return c.json({
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    collections: webhook.collections || "*",
    enabled: webhook.enabled,
    description: webhook.description,
    createdAt: webhook.created_at,
    updatedAt: webhook.updated_at,
  });
});

/**
 * DELETE /webhooks/:id
 * Delete a webhook
 */
webhookRoutes.delete("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    "DELETE FROM webhooks WHERE id = $1 AND database_id = $2 RETURNING id",
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * POST /webhooks/:id/rotate-secret
 * Generate a new webhook secret
 */
webhookRoutes.post("/:id/rotate-secret", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const newSecret = generateWebhookSecret();

  const result = await pool.query(
    `UPDATE webhooks SET secret = $1, updated_at = NOW()
     WHERE id = $2 AND database_id = $3 RETURNING id`,
    [newSecret, id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  return c.json({ secret: newSecret });
});

/**
 * GET /webhooks/:id/deliveries
 * Get delivery history for a webhook
 */
webhookRoutes.get("/:id/deliveries", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const pool = getPool();

  // Verify webhook belongs to this database
  const webhookCheck = await pool.query(
    "SELECT id FROM webhooks WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (webhookCheck.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  const result = await pool.query(
    `SELECT id, event, payload, status, status_code, response, attempts, next_retry_at, created_at, completed_at
     FROM webhook_deliveries WHERE webhook_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [id, limit, offset],
  );

  return c.json(
    result.rows.map((row: any) => ({
      id: row.id,
      webhookId: id,
      event: row.event,
      payload: row.payload,
      status: row.status,
      statusCode: row.status_code,
      response: row.response,
      attempts: row.attempts,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    })),
  );
});

/**
 * POST /webhooks/:id/deliveries/:deliveryId/retry
 * Retry a failed delivery
 */
webhookRoutes.post("/:id/deliveries/:deliveryId/retry", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const deliveryId = c.req.param("deliveryId");
  const pool = getPool();

  // Verify webhook belongs to this database
  const webhookResult = await pool.query(
    "SELECT id, url, secret, headers FROM webhooks WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (webhookResult.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  // Get delivery
  const deliveryResult = await pool.query(
    "SELECT id, payload FROM webhook_deliveries WHERE id = $1 AND webhook_id = $2",
    [deliveryId, id],
  );

  if (deliveryResult.rows.length === 0) {
    return c.json({ error: "Delivery not found" }, 404);
  }

  const webhook = webhookResult.rows[0];
  const delivery = deliveryResult.rows[0];

  // Queue for retry via Redis
  const redis = getRedis();
  await redis.lpush(
    "paperdb:webhook:queue",
    JSON.stringify({
      deliveryId: delivery.id,
      webhookId: webhook.id,
      url: webhook.url,
      payload: delivery.payload,
      secret: webhook.secret,
      headers: webhook.headers,
      isRetry: true,
    }),
  );

  // Update delivery status
  await pool.query(
    "UPDATE webhook_deliveries SET status = 'pending', attempts = attempts + 1 WHERE id = $1",
    [deliveryId],
  );

  return c.json({ status: "queued" });
});

/**
 * POST /webhooks/:id/test
 * Send a test webhook
 */
webhookRoutes.post("/:id/test", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    "SELECT id, url, secret, headers FROM webhooks WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  const webhook = result.rows[0];

  // Create test payload
  const testPayload = {
    event: "test",
    data: {
      message: "This is a test webhook from PaperDB",
      timestamp: new Date().toISOString(),
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = createSignature(payloadString, webhook.secret);

  // Send test webhook
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-PaperDB-Signature": signature,
      "X-PaperDB-Event": "test",
      ...(webhook.headers || {}),
    };

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
    });

    const responseText = await response.text().catch(() => "");

    // Record delivery
    const deliveryId = nanoid();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, status_code, response, attempts, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [
        deliveryId,
        id,
        "test",
        testPayload,
        response.ok ? "success" : "failed",
        response.status,
        responseText.substring(0, 1000),
        1,
        now,
      ],
    );

    return c.json({
      id: deliveryId,
      webhookId: id,
      event: "test",
      status: response.ok ? "success" : "failed",
      statusCode: response.status,
      response: responseText.substring(0, 500),
      createdAt: now,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Record failed delivery
    const deliveryId = nanoid();
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, response, attempts, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [deliveryId, id, "test", testPayload, "failed", errorMessage, 1, now],
    );

    return c.json({
      id: deliveryId,
      webhookId: id,
      event: "test",
      status: "failed",
      response: errorMessage,
      createdAt: now,
    });
  }
});
