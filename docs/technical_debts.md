# PaperDB V1 — Technical Debt & Future Improvements

This document tracks technical debt incurred during the V1 contract stabilization phase, as well as architectural improvements deferred to future phases (V1.x or V2).

## API & Validation

- [ ] **Auto-Generated OpenAPI Spec (`@hono/zod-openapi`)**
  - *Current State:* The OpenAPI spec (`openapi.ts`) is hand-maintained. While currently accurate, it risks diverging from the actual implementation.
  - *Improvement:* Refactor the Hono router to use `@hono/zod-openapi`. This will automatically derive the OpenAPI specification and route types from the centralized Zod schemas in `lib/validate.ts`.

- [ ] **Pagination Standardization**
  - *Current State:* The list endpoints (e.g., GET `/:collection/docs`) accept basic `limit` and `offset` parameters, but response envelopes don't include metadata like `totalCount` or `hasNextPage`.
  - *Improvement:* Implement a standard cursor-based or metadata-enriched pagination wrapper.

## Infrastructure & Performance

- [ ] **Rate Limiter Precision**
  - *Current State:* The Redis-backed rate limiter (`middleware/rate-limit.ts`) uses a simple `INCR` and `EXPIRE` mechanism.
  - *Improvement:* Upgrade to a Lua script sorted-set (sliding window) approach for strict sub-second precision, preventing burst limit bypasses at the edge of the expiration window.

- [ ] **Database Connection Pooling Configuration**
  - *Current State:* The `postgres.js` client in `lib/db.ts` uses default connection limits.
  - *Improvement:* Tune the `max` connections parameter based on the deployment target's available compute and the database instance's `max_connections` limit to prevent connection starvation under heavy load.

- [ ] **Quota & Auth Caching**
  - *Current State:* The `getDbIdFromApiKey` function in `lib/auth.ts` and the quota middleware perform a database `SELECT` on every authenticated request.
  - *Improvement:* Introduce a short-lived Redis caching layer for API key resolution and quota limits to drastically reduce database read pressure on high-traffic collections.

## Storage Backend

- [ ] **S3 SDK Integration Implementation**
  - *Current State:* The `storage.ts` route handles database metadata for files but currently uses mock logic or defers physical bucket uploads due to missing AWS SDK dependencies.
  - *Improvement:* Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`. Implement the actual generation of short-lived presigned URLs for client-side direct uploads, bypassing the API server entirely for heavy file transfers.

## Testing & Quality Assurance

- [ ] **End-to-End (E2E) Browser Testing**
  - *Current State:* Vitest covers all API operations via direct HTTP calls (`integration.test.ts`).
  - *Improvement:* Add a Playwright or Cypress suite to test the actual OAuth redirection flow (Google/GitHub) and the web dashboard interactions end-to-end.

- [ ] **Realtime Load Testing**
  - *Current State:* Realtime channel expansion logic works for single clients.
  - *Improvement:* Perform load testing on the `apps/realtime` websocket server to determine the maximum concurrent socket connections per instance and test Redis pub/sub memory pressure.
