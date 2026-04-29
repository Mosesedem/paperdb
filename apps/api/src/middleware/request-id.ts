import { nanoid } from "nanoid";
import type { MiddlewareHandler } from "hono";

/**
 * Injects an `X-Request-ID` header into every request/response and emits
 * a structured JSON log line after the response is sent.
 *
 * Log format:
 * {"requestId":"…","method":"GET","path":"/…","status":200,"durationMs":12,"apiKey":"pb_li…[masked]"}
 */
export const requestId: MiddlewareHandler = async (c, next) => {
  const id =
    c.req.header("X-Request-ID") ||
    c.req.header("X-Correlation-ID") ||
    nanoid(12);

  c.set("requestId" as any, id);
  c.header("X-Request-ID", id);

  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;

  const rawKey =
    c.req.header("X-API-Key") ||
    c.req.header("Authorization")?.replace("Bearer ", "");

  const maskedKey = rawKey
    ? `${rawKey.slice(0, 6)}…[masked]`
    : undefined;

  const entry = {
    requestId: id,
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs,
    ...(maskedKey ? { apiKey: maskedKey } : {}),
  };

  // Use stdout structured JSON for log aggregators (Loki, CloudWatch, etc.)
  process.stdout.write(JSON.stringify(entry) + "\n");
};
