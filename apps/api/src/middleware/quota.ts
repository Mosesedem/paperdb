import { createMiddleware } from "hono/factory";
import { checkApiQuota, checkDocumentQuota, checkRealtimeQuota } from "../lib/limits";
import { getDbIdFromApiKey } from "../lib/auth";

// Middleware to check API quota before processing requests
export const quotaMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const dbId = await getDbIdFromApiKey(authHeader);

  if (!dbId) {
    // Auth will be handled by the route, skip quota check
    return next();
  }

  const quota = await checkApiQuota(dbId);

  if (!quota.allowed) {
    return c.json(
      {
        error: quota.error,
        code: "QUOTA_EXCEEDED",
        limit: quota.limit,
        current: quota.current,
        plan: quota.plan,
        upgradeUrl: "https://paperdb.dev/pricing",
      },
      429
    );
  }

  // Attach plan info to context for route handlers
  c.set("plan", quota.plan);
  c.set("dbId", dbId);

  return next();
});

// Middleware specifically for document creation routes
export const documentQuotaMiddleware = createMiddleware(async (c, next) => {
  const dbId = c.get("dbId");

  if (!dbId) {
    return next();
  }

  const quota = await checkDocumentQuota(dbId);

  if (!quota.allowed) {
    return c.json(
      {
        error: quota.error,
        code: "DOCUMENT_LIMIT_EXCEEDED",
        limit: quota.limit,
        current: quota.current,
        plan: quota.plan,
        upgradeUrl: "https://paperdb.dev/pricing",
      },
      429
    );
  }

  return next();
});

// Middleware for realtime routes
export const realtimeQuotaMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const dbId = await getDbIdFromApiKey(authHeader);

  if (!dbId) {
    return next();
  }

  const quota = await checkRealtimeQuota(dbId);

  if (!quota.allowed) {
    return c.json(
      {
        error: quota.error,
        code: "REALTIME_NOT_AVAILABLE",
        plan: quota.plan,
        upgradeUrl: "https://paperdb.dev/pricing",
      },
      403
    );
  }

  c.set("dbId", dbId);
  return next();
});
