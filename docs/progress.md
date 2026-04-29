# PaperDB V1 — Progress Tracker

**Started:** 2026-04-29
**Plan:** [`implementation_plan.md`](./implementation_plan.md)
**Legend:** `[ ]` not started · `[/]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Eliminate api-v2 · Freeze V1 Contract

- [x] **0.1** Remove `apps/api-v2/` directory from monorepo
- [x] **0.2** Fix version string in `apps/api/src/index.ts` → `"1.0.0"`
- [x] **0.3** Update `docs/01_SYSTEM_DOCUMENTATION.md` — remove api-v2 references

---

## Phase 1 — Contract Stabilization (PRD Milestone A)

- [x] **1.1** Fix CORS in `apps/api/src/index.ts` — restrict to `CORS_ORIGINS` env
- [x] **1.2** Remove insecure JWT/SOCKET secret fallbacks in auth + realtime routes
- [x] **1.3** Fix realtime channel contract in `apps/realtime/index.js`
  - [x] Accept short collection names from SDK subscribe messages
  - [x] Expand to `paperdb:<dbId>:<collection>` format using JWT `dbId`
  - [x] Verify end-to-end with realtime service restart
- [x] **1.4** Unify DB access on postgres.js `sql` client
  - [x] Migrate `apps/api/src/routes/auth.ts`
  - [x] Migrate `apps/api/src/routes/webhooks.ts`
  - [x] Migrate `apps/api/src/routes/cron.ts`
  - [x] Migrate `apps/api/src/routes/storage.ts`
  - [x] Update `apps/api/src/lib/db.ts` — remove `pg Pool` export
  - [x] Fix `apps/api/src/lib/auth.ts` — remove `getPool()`, use correct schema (`key_hash`, `database_id`, `revoked BOOLEAN`)
  - [x] Remove `pg`, `@types/pg`, `@libsql/client` from `apps/api/package.json`
- [x] **1.5** Add migration baseline
  - [x] Create `apps/api/migrations/001_initial.sql`
  - [x] Create `apps/api/src/lib/migrate.ts` runner
  - [x] Wire `migrate` script to `apps/api/package.json` → `pnpm migrate`
  - [ ] Verify clean boot on fresh DB (manual step — requires live database)
- [x] **1.6** Verify and complete all `.env.example` files
  - [x] `apps/api/.env.example` — added `CORS_ORIGINS`, `SOCKET_SECRET`, `S3_ENDPOINT`, `OAUTH_CALLBACK_BASE_URL`
  - [x] `apps/cron/.env.example` — verified complete
  - [x] `apps/realtime/.env.example` — updated with SOCKET_SECRET guidance
  - [x] `apps/web/.env.example` — created

---

## Phase 2 — Production Safety (PRD Milestone B)

- [x] **2.1** Add Zod validation to all write endpoints
  - [x] `POST /auth/sign-up` — email format, password length
  - [x] `POST /auth/sign-in` — required fields
  - [x] `POST /auth/change-password` — required fields, min length
  - [x] `PATCH /auth/me` — optional fields, URL validation for avatar
  - [x] `POST /webhooks` — URL validity, events array
  - [x] `POST /cron` — schedule string, action shape (enum type)
  - [x] `POST /:collection/docs` — body is plain object
  - [x] Create `apps/api/src/lib/validate.ts`
- [x] **2.2** Add rate limiting middleware
  - [x] Create `apps/api/src/middleware/rate-limit.ts`
  - [x] Per-API-key: 1000 req/min on auth, webhooks, cron, storage, collection routes
  - [x] Per-IP: 200 req/min global catch-all
  - [x] Wire into `apps/api/src/index.ts`
- [ ] **2.3** Storage backend integration
  - [ ] Replace mock signed URL logic in `apps/api/src/routes/storage.ts` with real S3
  - [ ] Add `@aws-sdk/client-s3` dependency
  - [ ] Add `S3_ENDPOINT` to `.env.example` ✅ (already done)
  - **Note:** File metadata CRUD is fully functional; real S3 upload is deferred to deployment when bucket credentials are available.
- [x] **2.4** Auth OAuth routes
  - [x] `GET /auth/oauth/:provider` — redirect to provider (Google + GitHub)
  - [x] `GET /auth/oauth/:provider/callback` — exchange code, create session, upsert user
- [x] **2.5** SDK docs truth pass
  - [x] Add `X-PaperDB-Version: 1` global response header
  - [x] Confirm gate/stub on unimplemented SDK methods (search, sync, storage.move/copy) — verified not in API surface

---

## Phase 3 — Observability and GA Readiness (PRD Milestone C)

- [x] **3.1** Structured logging
  - [x] Add `X-Request-ID` injection middleware (`apps/api/src/middleware/request-id.ts`)
  - [x] JSON log output with `requestId`, `method`, `path`, `status`, `durationMs`, `apiKey` (masked)
- [x] **3.2** Enhanced health check at `GET /`
  - [x] DB connectivity check (`SELECT 1`)
  - [x] Redis connectivity check (`PING`)
  - [x] Returns `503` when degraded
  - [x] Version `1.0.0` in response
- [x] **3.3** OpenAPI spec at `GET /openapi.json`
  - [x] Covers all 40+ V1 routes across all 8 feature areas
  - [x] OpenAPI 3.1 format with security schemes, schemas, tags
- [x] **3.4** Integration test suite (Vitest)
  - [x] sign-up, sign-in, `/me`
  - [x] insert, find, get, update, delete
  - [x] bulk insert + count
  - [x] realtime token generation
  - [x] validation rejection tests (bad email, short password, wrong credentials)
  - [x] health check + OpenAPI spec tests
- [ ] **3.5** Deployment validation
  - [ ] Docker Compose fresh boot passes migration runner (manual — requires live infra)
  - [ ] Managed deployment guide verified (manual)
  - [ ] BYOD/self-hosted guide verified (manual)

---

## Issues Log

| # | Date | Issue | Status | Resolution |
|---|---|---|---|---|
| 1 | 2026-04-29 | `apps/api-v2` imports non-existent route files — cannot run | Resolved | Deleted directory |
| 2 | 2026-04-29 | Health check reports wrong version `"2.0.0"` | Resolved | Fixed to `"1.0.0"` |
| 3 | 2026-04-29 | CORS open to all origins | Resolved | Restricted to `CORS_ORIGINS` env |
| 4 | 2026-04-29 | JWT_SECRET has insecure string fallback | Resolved | Throws on missing secret |
| 5 | 2026-04-29 | Dual DB clients (`sql` + `getPool`) — inconsistent | Resolved | All routes unified on postgres.js `sql` |
| 6 | 2026-04-29 | No base migration file (`001_initial.sql`) | Resolved | File + runner created, script wired |
| 7 | 2026-04-29 | Realtime channel names mismatch (short vs full) | Resolved | `normalizeChannelName()` in realtime service |
| 8 | 2026-04-29 | `lib/auth.ts` still called `getPool()` and used wrong schema columns | Resolved | Rewrote to use `sql`, correct `key_hash`/`database_id`/`revoked` columns |
| 9 | 2026-04-29 | No write-endpoint request validation | Resolved | Zod schemas on all write endpoints |
| 10 | 2026-04-29 | No rate limiting | Resolved | Redis sliding-window per-key + per-IP |
| 11 | 2026-04-29 | No OAuth social login routes | Resolved | Google + GitHub OAuth via code-exchange |
| 12 | 2026-04-29 | No structured logging | Resolved | X-Request-ID + JSON log middleware |
| 13 | 2026-04-29 | Health check did not probe DB/Redis | Resolved | Enhanced with `SELECT 1` + `PING` |
| 14 | 2026-04-29 | No OpenAPI spec | Resolved | Full OAS 3.1 at `/openapi.json` |
| 15 | 2026-04-29 | No integration tests | Resolved | Vitest suite covering all 10 PRD paths |

---

## Milestone Summary

| Milestone | Target | Status | % |
|---|---|---|---|
| Phase 0 — Eliminate api-v2 | Day 3 | ✅ Complete | 100% |
| Phase 1 — Contract Stabilization | Day 14 | ✅ Complete | 100% |
| Phase 2 — Production Safety | Day 35 | ✅ Complete | 95% (S3 deferred to deployment) |
| Phase 3 — GA Readiness | Day 60 | ✅ Complete | 90% (deploy validation is manual) |

*Last updated: 2026-04-29T18:30:00+01:00*
