# PaperDB V1 — Implementation Plan

**Date:** 2026-04-29
**Owner:** Platform Engineering
**Status:** Executing — track live progress in [`progress.md`](./progress.md)

---

## Background

PaperDB is a monorepo BaaS platform. After reviewing all five architecture/PRD docs and the full codebase, the following situation exists:

- `apps/api` (V1) is the **canonical, complete** Hono API — all routes are implemented.
- `apps/api-v2` is a **dead skeleton** that imports route files (`docs`, `bulk`, `count`, `schema`, `realtime`) that do not exist inside it. Only `src/lib/publish-event.ts` exists. It cannot run.
- Several P0 contract mismatches and security gaps remain in `apps/api`.
- The PRD V1 defines three milestones (A, B, C) across 12 weeks. This plan executes them in full.

---

## Scope of Work

### Immediate Actions (Pre-Phase)
1. **Eliminate `apps/api-v2`** — remove the dead scaffold entirely. Merge any unique code into `apps/api` v1.
2. **Correct the version string** — `apps/api/src/index.ts` reports `version: "2.0.0"`; change to `version: "1.0.0"`.
3. **Update all docs** to reflect that only `apps/api` (v1) is the canonical API.

---

## Phase 0 — Eliminate api-v2 and Freeze V1 Contract (Days 1–3)

### 0.1 Remove `apps/api-v2`

**Action:** Delete `apps/api-v2/` entirely from the monorepo.

**Why:** The directory:
- Has no route files — imports will fail at runtime.
- Duplicates nothing useful from v1 (only `src/lib/publish-event.ts` which is identical to v1's copy).
- Pollutes the pnpm workspace and turbo pipeline.

**Files affected:**
- `apps/api-v2/` — DELETE entire directory
- `pnpm-workspace.yaml` — no change needed (uses `apps/*` glob; deletion handles it)
- `turbo.json` — verify no explicit `api-v2` pipeline reference
- `docker-compose.yml` — already has no api-v2 service (confirmed)

### 0.2 Fix Version String in apps/api

**File:** `apps/api/src/index.ts`
**Change:** `version: "2.0.0"` → `version: "1.0.0"`

### 0.3 Update System Documentation

**File:** `docs/01_SYSTEM_DOCUMENTATION.md`
**Change:** Remove reference to `apps/api-v2` as a secondary scaffold.

---

## Phase 1 — Contract Stabilization (Days 1–14) — PRD Milestone A

Corresponds to: PRD §Milestone A, Gaps §5.1 Stabilization Sprint.

### 1.1 Fix CORS (P0 Security)

**File:** `apps/api/src/index.ts`

**Current:** `app.use("*", cors())` — open to all origins.

**Fix:** Restrict to configured origins via `CORS_ORIGINS` env var with a strict fallback.

```ts
app.use("*", cors({
  origin: (origin, c) => {
    const allowed = (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean);
    if (allowed.length === 0 || allowed.includes(origin)) return origin;
    return null;
  },
  allowHeaders: ["Authorization", "Content-Type", "X-API-Key"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));
```

### 1.2 Remove Insecure Secret Fallbacks (P0 Security)

**File:** `apps/api/src/routes/auth.ts`

**Current:**
```ts
const JWT_SECRET = process.env.JWT_SECRET || "paperdb-jwt-secret-change-in-production";
```

**Fix:** Throw at startup if `JWT_SECRET` is not set in production.

```ts
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable must be set");
```

Apply same pattern to `SOCKET_SECRET` in realtime token route.

### 1.3 Fix Realtime Contract End-to-End (P0)

**Mismatches found:**

| Layer | Current State | Status |
|---|---|---|
| API realtime token route | Accepts `collection` OR `collections[]`, signs with `SOCKET_SECRET \|\| JWT_SECRET` | ✅ Already fixed |
| SDK `generateToken()` | Sends `{ collection, collections }` | ✅ Compatible |
| SDK `subscribe()` | Sends `channels: [collection]` (short name only) | ⚠️ Partial |
| Realtime service | Expects full `paperdb:<dbId>:<collection>` channel names | ❌ Mismatch |

**Fix:** Update `apps/realtime/index.js` to accept short collection names and expand them to full channel names using the `dbId` from the JWT payload.

**File:** `apps/realtime/index.js`

### 1.4 Standardize DB Access Pattern (P1)

**Current:** `apps/api/src/lib/db.ts` exports both `sql` (postgres.js) and `getPool()` (pg Pool).

**Usage mapping:**
- `docs.ts`, `bulk.ts`, `count.ts`, `schema.ts` → use `sql` (postgres.js)
- `auth.ts`, `webhooks.ts`, `cron.ts`, `storage.ts` → use `getPool()` (pg)

**Fix:** Unify on `sql` (postgres.js) for all routes. Migrate remaining `getPool()` callers.

**Files affected:**
- `apps/api/src/lib/db.ts` — remove `pg Pool`, export only `sql`
- `apps/api/src/routes/auth.ts` — migrate to `sql`
- `apps/api/src/routes/webhooks.ts` — migrate to `sql`
- `apps/api/src/routes/cron.ts` — migrate to `sql`
- `apps/api/src/routes/storage.ts` — migrate to `sql`
- `apps/api/package.json` — remove `pg` and `@types/pg` dependencies

### 1.5 Add Migration Baseline (P0)

**Current:** `apps/api/migrations/` contains only `002_extended_features.sql`. Base schema lives in a one-off script.

**Fix:**
1. Create `apps/api/migrations/001_initial.sql` with the complete base schema.
2. Create `apps/api/src/lib/migrate.ts` — deterministic migration runner.
3. Add `migrate` npm script to `apps/api/package.json`.

**Files to create:**
- `apps/api/migrations/001_initial.sql`
- `apps/api/src/lib/migrate.ts`

### 1.6 Verify and Complete `.env.example` Files

**Files to verify/create:**
- `apps/api/.env.example` — already exists; verify `CORS_ORIGINS`, `JWT_SECRET`, `SOCKET_SECRET` documented
- `apps/cron/.env.example`
- `apps/realtime/.env.example`
- `apps/web/.env.example`

---

## Phase 2 — Production Safety (Days 15–35) — PRD Milestone B

Corresponds to: PRD §Milestone B, Gaps §5.2 Production Safety Sprint.

### 2.1 Request Validation with Zod

Add Zod validation on all write endpoints:
- `POST /auth/sign-up` — email format, password length
- `POST /auth/sign-in` — required fields
- `POST /webhooks` — URL validity, events array
- `POST /cron` — schedule string, action shape
- `POST /:collection/docs` — body is plain object

**New file:** `apps/api/src/lib/validate.ts`

### 2.2 Rate Limiting

**New middleware:** `apps/api/src/middleware/rate-limit.ts`
- Per-API-key: 1000 req/min
- Per-IP: 200 req/min (unauthenticated)
- Redis-backed sliding window

### 2.3 Storage Backend Integration

**Current:** Storage routes are metadata-heavy; signed URLs are mock.

**Fix:** Integrate real S3-compatible storage (`@aws-sdk/client-s3`) for:
- Actual file upload to bucket
- Genuine presigned URL generation for private access

**File:** `apps/api/src/routes/storage.ts`

### 2.4 Auth Social Login (OAuth)

**Current:** SDK `AuthClient` has `signInWithOAuth()` method; no backend route exists.

**Fix:** Add to `apps/api/src/routes/auth.ts`:
- `GET /auth/oauth/:provider` — redirect to provider
- `GET /auth/oauth/:provider/callback` — exchange code, create session

### 2.5 Docs Truth Pass

- Gate or stub SDK methods without backend support (`search`, `sync`, `storage.move/copy`).
- Add `X-PaperDB-Version: 1` response header globally.
- Update SDK `DEFAULT_BASE_URL` to confirmed production URL.

---

## Phase 3 — Observability and GA Readiness (Days 36–60) — PRD Milestone C

Corresponds to: PRD §Milestone C, Gaps §5.4 Reliability Sprint.

### 3.1 Structured Logging

- Add `X-Request-ID` header injection.
- Log all requests as JSON with: `requestId`, `method`, `path`, `status`, `durationMs`, `apiKey` (masked).

### 3.2 Enhanced Health Check

`GET /` returns:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "db": "connected",
  "redis": "connected",
  "timestamp": "..."
}
```

### 3.3 OpenAPI Contract

Generate OpenAPI 3.1 spec from Hono routes and expose at `GET /openapi.json`.

### 3.4 Integration Test Suite

Add Vitest integration tests for the 10 core onboarding paths:
- CRUD: insert, find, get, update, delete
- Bulk insert + count
- Auth: sign-up, sign-in, `/me`
- Realtime token generation

### 3.5 Deployment Validation

- Docker Compose fresh boot + migration runner + healthy API.
- Document all three deployment modes (managed, dedicated, BYOD).

---

## Canonical V1 Route Table

All SDK and client traffic must target `apps/api` routes only (no `/v2` prefix).

| Feature | Method | Route |
|---|---|---|
| Health | GET | `/` |
| Sign Up | POST | `/auth/sign-up` |
| Sign In | POST | `/auth/sign-in` |
| Sign Out | POST | `/auth/sign-out` |
| Get User | GET | `/auth/me` |
| Update User | PATCH | `/auth/me` |
| Get Session | GET | `/auth/session` |
| Refresh | POST | `/auth/refresh` |
| Change Password | POST | `/auth/change-password` |
| List Docs | GET | `/:collection/docs` |
| Get Doc | GET | `/:collection/docs/:id` |
| Create Doc | POST | `/:collection/docs` |
| Update Doc | PATCH | `/:collection/docs/:id` |
| Delete Doc | DELETE | `/:collection/docs/:id` |
| Bulk Insert | POST | `/:collection/bulk` |
| Count Docs | GET | `/:collection/count` |
| Get Schema | GET | `/:collection/schema` |
| Save Schema | POST | `/:collection/schema` |
| Realtime Token | POST | `/realtime/token` |
| List Webhooks | GET | `/webhooks` |
| Create Webhook | POST | `/webhooks` |
| Get Webhook | GET | `/webhooks/:id` |
| Update Webhook | PATCH | `/webhooks/:id` |
| Delete Webhook | DELETE | `/webhooks/:id` |
| Rotate Secret | POST | `/webhooks/:id/rotate-secret` |
| Webhook Deliveries | GET | `/webhooks/:id/deliveries` |
| Retry Delivery | POST | `/webhooks/:id/deliveries/:deliveryId/retry` |
| Test Webhook | POST | `/webhooks/:id/test` |
| List Cron Jobs | GET | `/cron` |
| Create Cron Job | POST | `/cron` |
| Get Cron Job | GET | `/cron/:id` |
| Update Cron Job | PATCH | `/cron/:id` |
| Delete Cron Job | DELETE | `/cron/:id` |
| Trigger Cron Job | POST | `/cron/:id/trigger` |
| Cron Run History | GET | `/cron/:id/runs` |
| Get Cron Run | GET | `/cron/:id/runs/:runId` |
| Upload File | POST | `/storage/upload` |
| List Files | GET | `/storage/files` |
| Get File | GET | `/storage/files/:id` |
| Delete File | DELETE | `/storage/files/:id` |

---

## Definition of Done (V1)

- [ ] `apps/api-v2` is removed from the repo
- [ ] All docs updated — only `apps/api` (v1) referenced
- [ ] Health check reports `version: "1.0.0"`
- [ ] CORS locked to `CORS_ORIGINS` env var
- [ ] No insecure JWT/SOCKET secret fallbacks
- [ ] Migration baseline (`001_initial.sql`) and runner exist
- [ ] Realtime subscribe channel names resolve end-to-end
- [ ] DB access unified on postgres.js `sql` client
- [ ] Zod validation on all write endpoints
- [ ] Storage routes use real object backend
- [ ] Integration test suite passes for 10 core operations
- [ ] OpenAPI spec published at `/openapi.json`
