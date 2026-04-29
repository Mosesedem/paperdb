import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { docsRoutes } from "./routes/docs.js";
import { bulkRoutes } from "./routes/bulk.js";
import { countRoutes } from "./routes/count.js";
import { schemaRoutes } from "./routes/schema.js";
import { realtimeRoutes } from "./routes/realtime.js";
import { authRoutes } from "./routes/auth.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { cronRoutes } from "./routes/cron.js";
import { storageRoutes } from "./routes/storage.js";
import {
  quotaMiddleware,
  realtimeQuotaMiddleware,
} from "./middleware/quota.js";

// Validate critical secrets at startup
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable must be set. Refusing to start without a secure secret."
  );
}

const app = new Hono();

// Middleware
app.use("*", logger());

// CORS — restrict to configured origins in production.
// Set CORS_ORIGINS as a comma-separated list of allowed origins.
// Leave empty or unset in development to allow all origins.
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
    allowHeaders: ["Authorization", "Content-Type", "X-API-Key"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-PaperDB-Version"],
  })
);

// Add version header to all responses
app.use("*", async (c, next) => {
  await next();
  c.header("X-PaperDB-Version", "1");
});

// Health check
app.get("/", async (c) => {
  return c.json({ status: "ok", message: "PaperDB API", version: "1.0.0" });
});

// Platform routes (auth, webhooks, cron, storage)
app.route("/auth", authRoutes);
app.route("/webhooks", webhookRoutes);
app.route("/cron", cronRoutes);
app.route("/storage", storageRoutes);

// Apply quota middleware to all collection routes
app.use("/:collection/*", quotaMiddleware);

// Collection routes
app.route("/:collection/docs", docsRoutes);
app.route("/:collection/bulk", bulkRoutes);
app.route("/:collection/count", countRoutes);
app.route("/:collection/schema", schemaRoutes);

// Realtime routes with specific quota check
app.use("/realtime/*", realtimeQuotaMiddleware);
app.route("/realtime", realtimeRoutes);

const port = parseInt(process.env.PORT || "3001", 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 PaperDB API running on http://localhost:${info.port}`);
  },
);
