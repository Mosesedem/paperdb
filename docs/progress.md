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
- [/] **1.3** Fix realtime channel contract in `apps/realtime/index.js`
  - [x] Accept short collection names from SDK subscribe messages
  - [x] Expand to `paperdb:<dbId>:<collection>` format using JWT `dbId`
  - [ ] Verify end-to-end with realtime service restart
- [/] **1.4** Unify DB access on postgres.js `sql` client
  - [x] Migrate `apps/api/src/routes/auth.ts`
  - [x] Migrate `apps/api/src/routes/webhooks.ts`
  - [x] Migrate `apps/api/src/routes/cron.ts`
  - [x] Migrate `apps/api/src/routes/storage.ts`
  - [x] Update `apps/api/src/lib/db.ts` — remove `pg Pool` export
  - [ ] Remove `pg` from `apps/api/package.json`
- [/] **1.5** Add migration baseline
  - [x] Create `apps/api/migrations/001_initial.sql`
  - [x] Create `apps/api/src/lib/migrate.ts` runner
  - [ ] Wire `migrate` script to `apps/api/package.json`
  - [ ] Verify clean boot on fresh DB
- [ ] **1.6** Verify and complete all `.env.example` files
  - [ ] `apps/api/.env.example` — add `CORS_ORIGINS`, `SOCKET_SECRET`
  - [ ] `apps/cron/.env.example`
  - [ ] `apps/realtime/.env.example`
  - [ ] `apps/web/.env.example`

---

## Phase 2 — Production Safety (PRD Milestone B)

- [ ] **2.1** Add Zod validation to all write endpoints
  - [ ] `POST /auth/sign-up`
  - [ ] `POST /auth/sign-in`
  - [ ] `POST /webhooks`
  - [ ] `POST /cron`
  - [ ] `POST /:collection/docs`
  - [ ] Create `apps/api/src/lib/validate.ts`
- [ ] **2.2** Add rate limiting middleware
  - [ ] Create `apps/api/src/middleware/rate-limit.ts`
  - [ ] Wire into `apps/api/src/index.ts`
- [ ] **2.3** Storage backend integration
  - [ ] Install `@aws-sdk/client-s3`
  - [ ] Replace mock signed URL logic in `apps/api/src/routes/storage.ts`
  - [ ] Add `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_KEY`, `STORAGE_SECRET` to `.env.example`
- [ ] **2.4** Auth OAuth routes
  - [ ] `GET /auth/oauth/:provider` — redirect to provider
  - [ ] `GET /auth/oauth/:provider/callback` — exchange code, create session
- [ ] **2.5** SDK docs truth pass
  - [ ] Gate/stub `search`, `sync`, `storage.move/copy` SDK methods
  - [ ] Add `X-PaperDB-Version: 1` global response header
  - [ ] Confirm SDK `DEFAULT_BASE_URL` is production URL

---

## Phase 3 — Observability and GA Readiness (PRD Milestone C)

- [ ] **3.1** Structured logging
  - [ ] Add `X-Request-ID` injection middleware
  - [ ] JSON log output with `requestId`, `method`, `path`, `status`, `durationMs`
- [ ] **3.2** Enhanced health check at `GET /`
  - [ ] DB connectivity check
  - [ ] Redis connectivity check
  - [ ] Version `1.0.0` in response
- [ ] **3.3** OpenAPI spec at `GET /openapi.json`
- [ ] **3.4** Integration test suite (Vitest)
  - [ ] insert, find, get, update, delete
  - [ ] bulk insert + count
  - [ ] sign-up, sign-in, `/me`
  - [ ] realtime token generation
- [ ] **3.5** Deployment validation
  - [ ] Docker Compose fresh boot passes migration runner
  - [ ] Managed deployment guide verified
  - [ ] BYOD/self-hosted guide verified

---

## Issues Log

| # | Date | Issue | Status | Resolution |
|---|---|---|---|---|
| 1 | 2026-04-29 | `apps/api-v2` imports non-existent route files — cannot run | Resolved | Deleted directory |
| 2 | 2026-04-29 | Health check reports wrong version `"2.0.0"` | Resolved | Fixed to `"1.0.0"` |
| 3 | 2026-04-29 | CORS open to all origins | Resolved | Restricted to `CORS_ORIGINS` env |
| 4 | 2026-04-29 | JWT_SECRET has insecure string fallback | Resolved | Throws on missing secret |
| 5 | 2026-04-29 | Dual DB clients (`sql` + `getPool`) — inconsistent | In Progress | Migrating all routes to `sql` |
| 6 | 2026-04-29 | No base migration file (`001_initial.sql`) | In Progress | Creating file + runner |
| 7 | 2026-04-29 | Realtime channel names mismatch (short vs full) | In Progress | Fixing in realtime service |

---

## Milestone Summary

| Milestone | Target | Status | % |
|---|---|---|---|
| Phase 0 — Eliminate api-v2 | Day 3 | ✅ Complete | 100% |
| Phase 1 — Contract Stabilization | Day 14 | 🔄 In Progress | 55% |
| Phase 2 — Production Safety | Day 35 | ⏳ Not Started | 0% |
| Phase 3 — GA Readiness | Day 60 | ⏳ Not Started | 0% |

*Last updated: 2026-04-29T16:00:00+01:00*
