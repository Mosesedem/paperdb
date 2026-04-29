import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { docsRoutes } from "./routes/docs.js";
import { bulkRoutes } from "./routes/bulk.js";
import { countRoutes } from "./routes/count.js";
import { schemaRoutes } from "./routes/schema.js";
import { realtimeRoutes } from "./routes/realtime.js";
import { authRoutes } from "./routes/auth.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { cronRoutes } from "./routes/cron.js";
import { storageRoutes } from "./routes/storage.js";
import { openapiRoutes } from "./routes/openapi.js";
import {
  quotaMiddleware,
  realtimeQuotaMiddleware,
} from "./middleware/quota.js";
import { apiKeyRateLimit, ipRateLimit } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { sql } from "./lib/db.js";
import { getRedis } from "./lib/redis.js";

// ── Startup validation ───────────────────────────────────────────────────────

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable must be set. Refusing to start without a secure secret.",
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

const app = new Hono();

// Structured request logging + X-Request-ID
app.use("*", requestId);

// CORS — restrict to configured origins in production.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: allowedOrigins.length
      ? (origin) => (allowedOrigins.includes(origin) ? origin : null)
      : "*",
    allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Request-ID"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-PaperDB-Version", "X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
  }),
);

// Add PaperDB version header to every response
app.use("*", async (c, next) => {
  await next();
  c.header("X-PaperDB-Version", "1");
});

// IP-based rate limiting for all unauthenticated/public traffic
app.use("*", ipRateLimit);

// ── Health check (enhanced) ──────────────────────────────────────────────────

app.get("/", async (c) => {
  let dbStatus = "connected";
  let redisStatus = "connected";

  try {
    await sql`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  try {
    const redis = getRedis();
    await redis.ping();
  } catch {
    redisStatus = "error";
  }

  const status = dbStatus === "connected" && redisStatus === "connected" ? "ok" : "degraded";

  return c.json(
    {
      status,
      version: "1.0.0",
      db: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    },
    status === "ok" ? 200 : 503,
  );
});

// ── OpenAPI spec ─────────────────────────────────────────────────────────────

app.route("/openapi.json", openapiRoutes);

// ── Platform routes — API-key rate limiting ──────────────────────────────────

app.use("/auth/*", apiKeyRateLimit);
app.use("/webhooks/*", apiKeyRateLimit);
app.use("/cron/*", apiKeyRateLimit);
app.use("/storage/*", apiKeyRateLimit);

app.route("/auth", authRoutes);
app.route("/webhooks", webhookRoutes);
app.route("/cron", cronRoutes);
app.route("/storage", storageRoutes);

// ── Collection routes ────────────────────────────────────────────────────────

app.use("/:collection/*", quotaMiddleware);
app.use("/:collection/*", apiKeyRateLimit);

app.route("/:collection/docs", docsRoutes);
app.route("/:collection/bulk", bulkRoutes);
app.route("/:collection/count", countRoutes);
app.route("/:collection/schema", schemaRoutes);

// ── Realtime ─────────────────────────────────────────────────────────────────

app.use("/realtime/*", realtimeQuotaMiddleware);
app.route("/realtime", realtimeRoutes);

// ── Start ────────────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3001", 10);

serve(
  { fetch: app.fetch, port },
  (info) => {
    console.log(`🚀 PaperDB API v1.0.0 running on http://localhost:${info.port}`);
    console.log(`📖 OpenAPI spec: http://localhost:${info.port}/openapi.json`);
  },
);
