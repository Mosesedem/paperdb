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

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", message: "PaperDB API", version: "2.0.0" });
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
