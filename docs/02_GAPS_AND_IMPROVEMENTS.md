# PaperDB Gaps and Improvements

Date: 2026-04-23

## 1. Review Outcome

This section lists missing or risky areas grouped by priority, with direct engineering implications.

## 2. P0 Critical Gaps (Block Production-Grade Reliability)

### 2.1 Realtime Contract Mismatch Across API, SDK, and Realtime Service

Observed mismatches:

- API realtime token route expects collection (singular), not collections.
- SDK generateToken sends collections array.
- API token route signs with JWT_SECRET.
- Realtime service verifies with SOCKET_SECRET.
- SDK subscribe sends message field type, realtime service expects action.
- SDK channels are short names, realtime service expects full channel names (paperdb:<dbId>:<collection>).
- SDK websocket URL derives from API base URL; realtime runs as separate service.

Impact:

- Realtime subscriptions are unreliable or broken out of the box.

### 2.2 Queue Contract Mismatch for Cron/Webhook Triggering

Observed mismatches:

- API enqueues manual retries/triggers via raw Redis list pushes:
  - paperdb:webhook:queue
  - paperdb:cron:queue
- Worker consumes BullMQ queues:
  - paperdb:webhook
  - paperdb:cron

Impact:

- Manual retry/trigger operations can be silently queued into channels workers do not consume.

### 2.3 Data Model Inconsistency in kv_store Access

Observed mismatches:

- Some routes use kv_store.value.
- Other routes reference kv_store.data.
- Usage API in web also references k.data.

Impact:

- Count/bulk/usage behavior may fail depending on actual deployed schema.

### 2.4 Missing Base Migration in Canonical Migration Folder

Observed state:

- apps/api/migrations only contains 002_extended_features.sql.
- Base schema creation lives in a migration helper script, not formal migration sequence.

Impact:

- Fresh environment bootstrapping is fragile and non-deterministic.

## 3. P1 High-Priority Gaps (Major Functional/Trust Issues)

### 3.1 SDK Feature Surface Exceeds Backend Implementation

SDK methods exist for capabilities without corresponding API routes (for example):

- auth oauth/magic-link/reset flows
- search routes
- storage move/copy/get-by-path/delete-folder

Impact:

- Developers will encounter runtime 404/contract errors despite type-safe client availability.

### 3.2 Bulk and Count API/SDK Payload Shape Mismatch

Examples:

- SDK bulk sends raw array payload.
- API bulk route expects { documents: [...] }.
- SDK count sends filter[field] query style.
- API count route expects a single JSON filter query param string.

Impact:

- Basic SDK usage paths fail or behave unexpectedly.

### 3.3 Security Hardening Incomplete

Current concerns:

- CORS wide open by default.
- Secret fallback defaults in multiple places.
- No global schema validation middleware for route bodies/query.
- Dynamic SQL patterns need hardening and strict allowlists.

Impact:

- Elevated abuse and security risk in production deployment.

### 3.4 No Automated Tests in Repository

Observed:

- No test files discovered.

Impact:

- Regression risk is high, especially during contract stabilization.

## 4. P2 Important Gaps (Scale, DX, Product Maturity)

- Missing OpenAPI/typed API contract source of truth.
- Incomplete observability stack (trace IDs, metrics, SLO dashboards).
- No formal backup/restore runbooks surfaced in code.
- No clear enterprise tenancy model (RLS vs isolated DB per customer) enforced consistently.
- apps/api-v2 contains broken import and appears incomplete.

## 5. Improvement Plan

## 5.1 Stabilization Sprint (0-14 Days)

Objectives:

- unify contracts and remove broken paths quickly

Tasks:

1. Define and lock one API contract source (OpenAPI or shared TS schema).
2. Fix realtime contract end to end:
   - token payload shape
   - secret usage
   - websocket endpoint origin/port strategy
   - subscribe message shape
3. Fix queue integration:
   - API routes should enqueue via BullMQ queue producer, not Redis list push.
4. Standardize kv_store schema usage (pick value or data and migrate all code).
5. Align bulk/count SDK and API payload/query formats.

Acceptance criteria:

- CRUD, bulk, count, cron trigger, webhook retry, and realtime pass integration tests.

## 5.2 Production Safety Sprint (15-35 Days)

Tasks:

1. Introduce 001_initial.sql and migration tracking table.
2. Implement migration runner command for deterministic startup.
3. Add request validation with Zod (or equivalent) on all write endpoints.
4. Restrict CORS by configured origins.
5. Remove insecure secret fallbacks in production mode.
6. Add baseline rate limiting (per API key and per IP).

Acceptance criteria:

- clean boot of empty database to latest schema
- secure-by-default production profile

## 5.3 Feature Truth Sprint (36-60 Days)

Tasks:

1. Either implement or hide SDK methods that are not backend-supported.
2. Add explicit capability discovery endpoint/versioning.
3. Align docs and README claims to verified functionality only.
4. Add storage backend integration (S3/R2/MinIO) or label as metadata-only experimental.

Acceptance criteria:

- no documented feature should 404 in normal flow
- SDK docs equal actual backend support

## 5.4 Reliability Sprint (61-90 Days)

Tasks:

1. Establish test pyramid:
   - unit tests for route validators and helpers
   - integration tests for API with Postgres/Redis test containers
   - end-to-end tests for SDK against running stack
2. Add observability stack:
   - structured logging
   - error tracking
   - latency and queue depth metrics
3. Add operational runbooks:
   - backup/restore
   - incident response
   - deployment rollback

Acceptance criteria:

- stable CI pipeline with required checks before merge
- release confidence for early external users

## 6. Quick Wins to Execute Immediately

1. Remove or mark apps/api-v2 as experimental until fixed.
2. Add .env.example files for api, cron, realtime, web.
3. Add a compatibility matrix to README describing what is currently GA vs preview.
4. Create contract tests for the top 10 SDK methods used in onboarding examples.

## 7. Net Assessment

PaperDB can become highly competitive, but immediate value comes from reliability and contract coherence, not adding more feature breadth first.

Most urgent sequence:

- fix contradictions
- harden security/migrations
- prove reliability with tests
- then expand parity features
