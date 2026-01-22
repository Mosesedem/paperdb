/**
 * Cron Jobs API Routes
 * CRUD operations for scheduled jobs
 */
import { Hono, Context } from "hono";
import { nanoid } from "nanoid";
import { getPool } from "../lib/db.js";
import { authenticateApiKey, DbContext } from "../lib/auth.js";
import { getRedis } from "../lib/redis.js";

type Variables = {
  dbContext: DbContext;
};

export const cronRoutes = new Hono<{ Variables: Variables }>();

// Human-readable schedule patterns
const SCHEDULE_PATTERNS: Record<string, string> = {
  "every minute": "* * * * *",
  "every 5 minutes": "*/5 * * * *",
  "every 10 minutes": "*/10 * * * *",
  "every 15 minutes": "*/15 * * * *",
  "every 30 minutes": "*/30 * * * *",
  "every hour": "0 * * * *",
  "every 1 hour": "0 * * * *",
  "every 2 hours": "0 */2 * * *",
  "every 6 hours": "0 */6 * * *",
  "every 12 hours": "0 */12 * * *",
  daily: "0 0 * * *",
  "daily at midnight": "0 0 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
};

// Parse human-readable schedule to cron expression
function parseSchedule(schedule: string): string | null {
  const normalized = schedule.toLowerCase().trim();

  // Check predefined patterns
  if (SCHEDULE_PATTERNS[normalized]) {
    return SCHEDULE_PATTERNS[normalized];
  }

  // Parse "every N minutes/hours"
  const everyMatch = normalized.match(
    /^every (\d+) (minute|minutes|hour|hours|day|days)$/,
  );
  if (everyMatch) {
    const [, num, unit] = everyMatch;
    const n = parseInt(num, 10);
    if (unit.startsWith("minute")) {
      return `*/${n} * * * *`;
    }
    if (unit.startsWith("hour")) {
      return `0 */${n} * * *`;
    }
    if (unit.startsWith("day")) {
      return `0 0 */${n} * *`;
    }
  }

  // Parse "daily at Xam/pm"
  const dailyAtMatch = normalized.match(
    /^daily at (\d{1,2})(:\d{2})?\s*(am|pm)?$/,
  );
  if (dailyAtMatch) {
    const [, hour, minutes, ampm] = dailyAtMatch;
    let h = parseInt(hour, 10);
    const m = minutes ? parseInt(minutes.slice(1), 10) : 0;

    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;

    return `${m} ${h} * * *`;
  }

  // If it looks like a cron expression, validate and return
  if (
    /^[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  return null;
}

// Calculate next run time from cron expression
function getNextRunTime(
  cronExpression: string,
  timezone: string = "UTC",
): Date {
  // Simple implementation - in production use a library like cron-parser
  const now = new Date();
  const [minute, hour] = cronExpression.split(" ");

  const next = new Date(now);

  if (minute === "*" && hour === "*") {
    // Every minute
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0);
  } else if (minute.startsWith("*/")) {
    // Every N minutes
    const interval = parseInt(minute.slice(2), 10);
    const currentMinute = next.getMinutes();
    const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval;
    next.setMinutes(nextMinute);
    next.setSeconds(0);
  } else if (hour.startsWith("*/")) {
    // Every N hours
    const interval = parseInt(hour.slice(2), 10);
    const currentHour = next.getHours();
    const nextHour = Math.ceil((currentHour + 1) / interval) * interval;
    next.setHours(nextHour);
    next.setMinutes(parseInt(minute, 10) || 0);
    next.setSeconds(0);
  } else {
    // Specific time
    next.setHours(parseInt(hour, 10) || 0);
    next.setMinutes(parseInt(minute, 10) || 0);
    next.setSeconds(0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

// Middleware to authenticate API key
cronRoutes.use("*", async (c, next) => {
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
 * GET /cron
 * List all cron jobs
 */
cronRoutes.get("/", async (c) => {
  const { dbId } = c.get("dbContext");
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, name, description, schedule, cron_expression, timezone, action, enabled,
            last_run_at, last_run_status, next_run_at, created_at, updated_at
     FROM cron_jobs WHERE database_id = $1 ORDER BY created_at DESC`,
    [dbId],
  );

  return c.json(
    result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      schedule: row.schedule,
      cronExpression: row.cron_expression,
      timezone: row.timezone,
      action: row.action,
      enabled: row.enabled,
      lastRunAt: row.last_run_at,
      lastRunStatus: row.last_run_status,
      nextRunAt: row.next_run_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  );
});

/**
 * POST /cron
 * Create a new cron job
 */
cronRoutes.post("/", async (c) => {
  const { dbId } = c.get("dbContext");
  const body = await c.req.json();
  const {
    name,
    description,
    schedule,
    timezone = "UTC",
    action,
    enabled = true,
  } = body;

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  if (!schedule) {
    return c.json({ error: "Schedule is required" }, 400);
  }

  if (!action) {
    return c.json({ error: "Action is required" }, 400);
  }

  // Parse schedule
  const cronExpression = parseSchedule(schedule);
  if (!cronExpression) {
    return c.json(
      {
        error: `Invalid schedule: "${schedule}". Use formats like "every 5 minutes", "daily at 9am", or a cron expression.`,
      },
      400,
    );
  }

  // Validate action
  if (!["http", "collection", "function"].includes(action.type)) {
    return c.json(
      {
        error:
          "Invalid action type. Must be 'http', 'collection', or 'function'.",
      },
      400,
    );
  }

  const pool = getPool();
  const id = nanoid();
  const now = new Date().toISOString();
  const nextRunAt = enabled
    ? getNextRunTime(cronExpression, timezone).toISOString()
    : null;

  await pool.query(
    `INSERT INTO cron_jobs (id, database_id, name, description, schedule, cron_expression, timezone, action, enabled, next_run_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
    [
      id,
      dbId,
      name,
      description || null,
      schedule,
      cronExpression,
      timezone,
      JSON.stringify(action),
      enabled,
      nextRunAt,
      now,
    ],
  );

  // Register with cron worker via Redis
  if (enabled) {
    const redis = getRedis();
    await redis.hset(
      "paperdb:cron:jobs",
      id,
      JSON.stringify({
        id,
        dbId,
        cronExpression,
        timezone,
        action,
        nextRunAt,
      }),
    );
  }

  return c.json(
    {
      id,
      name,
      description,
      schedule,
      cronExpression,
      timezone,
      action,
      enabled,
      nextRunAt,
      createdAt: now,
      updatedAt: now,
    },
    201,
  );
});

/**
 * GET /cron/:id
 * Get a cron job by ID
 */
cronRoutes.get("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    `SELECT id, name, description, schedule, cron_expression, timezone, action, enabled,
            last_run_at, last_run_status, next_run_at, created_at, updated_at
     FROM cron_jobs WHERE id = $1 AND database_id = $2`,
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  const job = result.rows[0];
  return c.json({
    id: job.id,
    name: job.name,
    description: job.description,
    schedule: job.schedule,
    cronExpression: job.cron_expression,
    timezone: job.timezone,
    action: job.action,
    enabled: job.enabled,
    lastRunAt: job.last_run_at,
    lastRunStatus: job.last_run_status,
    nextRunAt: job.next_run_at,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
});

/**
 * PATCH /cron/:id
 * Update a cron job
 */
cronRoutes.patch("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, description, schedule, timezone, action, enabled } = body;

  const pool = getPool();

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  let newCronExpression: string | null = null;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (schedule !== undefined) {
    newCronExpression = parseSchedule(schedule);
    if (!newCronExpression) {
      return c.json({ error: `Invalid schedule: "${schedule}"` }, 400);
    }
    updates.push(`schedule = $${paramIndex++}`);
    values.push(schedule);
    updates.push(`cron_expression = $${paramIndex++}`);
    values.push(newCronExpression);
  }
  if (timezone !== undefined) {
    updates.push(`timezone = $${paramIndex++}`);
    values.push(timezone);
  }
  if (action !== undefined) {
    updates.push(`action = $${paramIndex++}`);
    values.push(JSON.stringify(action));
  }
  if (enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(enabled);
  }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id, dbId);

  const result = await pool.query(
    `UPDATE cron_jobs SET ${updates.join(", ")}
     WHERE id = $${paramIndex++} AND database_id = $${paramIndex}
     RETURNING id, name, description, schedule, cron_expression, timezone, action, enabled, next_run_at, created_at, updated_at`,
    values,
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  const job = result.rows[0];

  // Update next run time if schedule or enabled changed
  if (newCronExpression || enabled !== undefined) {
    const nextRunAt = job.enabled
      ? getNextRunTime(job.cron_expression, job.timezone).toISOString()
      : null;

    await pool.query("UPDATE cron_jobs SET next_run_at = $1 WHERE id = $2", [
      nextRunAt,
      id,
    ]);
    job.next_run_at = nextRunAt;

    // Update Redis
    const redis = getRedis();
    if (job.enabled) {
      await redis.hset(
        "paperdb:cron:jobs",
        id,
        JSON.stringify({
          id,
          dbId,
          cronExpression: job.cron_expression,
          timezone: job.timezone,
          action: job.action,
          nextRunAt,
        }),
      );
    } else {
      await redis.hdel("paperdb:cron:jobs", id);
    }
  }

  return c.json({
    id: job.id,
    name: job.name,
    description: job.description,
    schedule: job.schedule,
    cronExpression: job.cron_expression,
    timezone: job.timezone,
    action: job.action,
    enabled: job.enabled,
    nextRunAt: job.next_run_at,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
});

/**
 * DELETE /cron/:id
 * Delete a cron job
 */
cronRoutes.delete("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    "DELETE FROM cron_jobs WHERE id = $1 AND database_id = $2 RETURNING id",
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  // Remove from Redis
  const redis = getRedis();
  await redis.hdel("paperdb:cron:jobs", id);

  return c.json({ success: true });
});

/**
 * POST /cron/:id/trigger
 * Trigger a cron job immediately
 */
cronRoutes.post("/:id/trigger", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const pool = getPool();

  const result = await pool.query(
    "SELECT id, action FROM cron_jobs WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  const job = result.rows[0];

  // Create run record
  const runId = nanoid();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO cron_runs (id, cron_job_id, status, started_at)
     VALUES ($1, $2, $3, $4)`,
    [runId, id, "running", now],
  );

  // Queue for execution via Redis
  const redis = getRedis();
  await redis.lpush(
    "paperdb:cron:queue",
    JSON.stringify({
      runId,
      cronJobId: id,
      dbId,
      action: job.action,
      triggeredManually: true,
    }),
  );

  return c.json({
    id: runId,
    cronJobId: id,
    status: "running",
    startedAt: now,
  });
});

/**
 * GET /cron/:id/runs
 * Get run history for a cron job
 */
cronRoutes.get("/:id/runs", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const limit = parseInt(c.req.query("limit") || "20", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const pool = getPool();

  // Verify job belongs to this database
  const jobCheck = await pool.query(
    "SELECT id FROM cron_jobs WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (jobCheck.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  const result = await pool.query(
    `SELECT id, status, started_at, completed_at, duration_ms, result, error, logs
     FROM cron_runs WHERE cron_job_id = $1
     ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
    [id, limit, offset],
  );

  return c.json(
    result.rows.map((row: any) => ({
      id: row.id,
      cronJobId: id,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration_ms,
      result: row.result,
      error: row.error,
      logs: row.logs,
    })),
  );
});

/**
 * GET /cron/:id/runs/:runId
 * Get a specific run
 */
cronRoutes.get("/:id/runs/:runId", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const runId = c.req.param("runId");
  const pool = getPool();

  // Verify job belongs to this database
  const jobCheck = await pool.query(
    "SELECT id FROM cron_jobs WHERE id = $1 AND database_id = $2",
    [id, dbId],
  );

  if (jobCheck.rows.length === 0) {
    return c.json({ error: "Cron job not found" }, 404);
  }

  const result = await pool.query(
    `SELECT id, status, started_at, completed_at, duration_ms, result, error, logs
     FROM cron_runs WHERE id = $1 AND cron_job_id = $2`,
    [runId, id],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Run not found" }, 404);
  }

  const row = result.rows[0];
  return c.json({
    id: row.id,
    cronJobId: id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    duration: row.duration_ms,
    result: row.result,
    error: row.error,
    logs: row.logs,
  });
});
