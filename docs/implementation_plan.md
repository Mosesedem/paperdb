# PaperDB V1 Implementation Plan

**Date:** 2026-04-30
**Owner:** Platform Engineering
**Status:** Executed plan summary. Live progress is tracked in [progress.md](./progress.md).

This document records what was planned, what was actually completed, and what remains after the V1 stabilization work.

## 1. Result Summary

PaperDB V1 now has a coherent core contract:

- the dead `api-v2` scaffold is gone
- the API version is fixed to `1.0.0`
- the API, worker, realtime service, and dashboard are aligned around the same V1 surface
- core auth, CRUD, webhooks, cron, realtime, validation, rate limiting, logging, health, and OpenAPI are in place

## 2. Completed Phases

### Phase 0 - Eliminate `api-v2`

Completed:

- removed the dead `apps/api-v2` directory
- updated the API version string
- cleaned stale architecture references from the system docs

### Phase 1 - Contract Stabilization

Completed:

- restricted CORS to configured origins
- removed insecure secret fallbacks
- fixed the realtime channel contract
- unified database access on postgres.js
- added a deterministic migration baseline and runner
- completed the environment example files

### Phase 2 - Production Safety

Completed:

- Zod validation on write endpoints
- Redis-backed rate limiting
- OAuth routes for Google and GitHub
- API version header on responses
- truth pass for the SDK/docs contract

Still open:

- final object-storage backend integration

### Phase 3 - Observability and GA Readiness

Completed:

- request IDs
- structured JSON logging
- health checks for PostgreSQL and Redis
- OpenAPI publication
- integration tests for the core onboarding flows

Still open:

- manual deployment validation against live infrastructure

## 3. Canonical V1 Route Surface

The current API surface is the source of truth for client and docs work.

### Auth

- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/me`
- `PATCH /auth/me`
- `GET /auth/session`
- `POST /auth/refresh`
- `POST /auth/change-password`
- `GET /auth/oauth/:provider`
- `GET /auth/oauth/:provider/callback`

### Collections

- `GET /:collection/docs`
- `GET /:collection/docs/:id`
- `POST /:collection/docs`
- `PATCH /:collection/docs/:id`
- `DELETE /:collection/docs/:id`
- `POST /:collection/bulk`
- `GET /:collection/count`
- `GET /:collection/schema`
- `POST /:collection/schema`

### Platform

- `POST /realtime/token`
- `GET /webhooks`
- `POST /webhooks`
- `GET /webhooks/:id`
- `PATCH /webhooks/:id`
- `DELETE /webhooks/:id`
- `POST /webhooks/:id/rotate-secret`
- `GET /webhooks/:id/deliveries`
- `POST /webhooks/:id/deliveries/:deliveryId/retry`
- `POST /webhooks/:id/test`
- `GET /cron`
- `POST /cron`
- `GET /cron/:id`
- `PATCH /cron/:id`
- `DELETE /cron/:id`
- `POST /cron/:id/trigger`
- `GET /cron/:id/runs`
- `GET /cron/:id/runs/:runId`
- `POST /storage/upload`
- `POST /storage/upload-many`
- `POST /storage/upload-url`
- `GET /storage`
- `GET /storage/:id`
- `PATCH /storage/:id`
- `DELETE /storage/:id`
- `POST /storage/:id/signed-url`
- `GET /storage/folders`
- `POST /storage/folders`
- `GET /openapi.json`
- `GET /`

## 4. Remaining Work

The next releases should focus on:

1. real object storage integration
2. search contract finalization
3. supported auth expansion if passwordless/reset flows are to be public
4. broader load validation for realtime, cron, and webhook retries
5. docs/SDK contract checks in CI so the written docs cannot drift again

## 5. Phase 4 - Documentation Refresh

The current live effort is the documentation refresh and contract truth pass.

It is tracked in [progress.md](./progress.md) and includes:

- root and package READMEs
- the system documentation
- the gaps and improvements doc
- the production readiness checklist
- the docs landing page

## 6. Rule of Thumb

Treat the OpenAPI document and the current API routes as the contract.
Everything else should describe those routes, not invent new ones.
