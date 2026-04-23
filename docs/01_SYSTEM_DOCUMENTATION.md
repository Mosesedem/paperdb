# PaperDB System Documentation (Current State)

Date: 2026-04-23

## 1. Executive Summary

PaperDB is a pnpm/turbo monorepo that aims to provide a frontend-friendly backend platform with:

- Auth
- CRUD over document-like collections
- Storage
- Webhooks
- Cron
- Realtime
- SDKs and React bindings
- Dashboard/control plane

The architecture and codebase are substantial and already include most building blocks. However, several cross-service contract mismatches currently prevent parts of the platform from behaving as advertised.

## 2. Monorepo Structure

Root-level orchestration:

- package manager and workspace: pnpm workspace
- task orchestration: turbo
- containerized local stack: Docker Compose

Primary apps:

- apps/api: Hono API server for CRUD and platform endpoints
- apps/cron: BullMQ worker for cron jobs and webhooks
- apps/realtime: Node WebSocket gateway for realtime subscriptions
- apps/web: Next.js dashboard/docs site and control-plane APIs
- apps/api-v2: secondary API scaffold, currently incomplete

Primary packages:

- packages/sdks/notdb: core JavaScript/TypeScript SDK published as paperdb
- packages/sdks/notdb-react: React hooks/components package
- packages/cli: create-paperdb scaffolder
- shared config/UI packages

## 3. Runtime Architecture

### 3.1 Control Plane vs Data Plane

Control plane:

- apps/web handles user login, billing integration hooks, database creation, and usage views.

Data plane:

- apps/api handles app-facing data access and platform features.
- apps/realtime pushes live events to clients.
- apps/cron executes background jobs and webhook deliveries.

### 3.2 Infrastructure Dependencies

Required services:

- PostgreSQL
- Redis

Containerized local setup:

- postgres:16-alpine
- redis:7-alpine
- api on 3001
- realtime on 3002
- web on 3000 (or 6565 in local Next dev script)

## 4. API System (apps/api)

### 4.1 Framework and Patterns

- Hono server with global logger and CORS middleware.
- Route groups for auth, webhooks, cron, storage, collection CRUD, and realtime token generation.
- Mixed DB access style:
  - postgres.js tagged templates
  - pg Pool for some newer routes

### 4.2 Auth Endpoints

Implemented:

- sign-up, sign-in, sign-out
- me, session, refresh
- profile update
- password change

Behavior:

- API-key scoped tenant context for SDK auth users.
- bcrypt password hashing.
- JWT session token (7-day expiration).
- sdk_users and sdk_sessions table usage.

### 4.3 Collection CRUD Endpoints

Implemented:

- GET list with filters/sorting/pagination
- GET by id
- POST create
- PATCH update
- DELETE by id

Additional behavior:

- schema validation via collection_schema
- unique field checks
- db_events logging
- redis event publishing for realtime
- automatic indexed-field tracking

### 4.4 Bulk, Count, Schema Endpoints

Implemented endpoints exist, but there are data-model inconsistencies across routes:

- docs routes operate on kv_store.value
- bulk/count paths in current code reference kv_store.data

Schema route supports save/read for per-collection schema definitions.

### 4.5 Platform Routes

Webhooks:

- CRUD
- delivery history
- secret rotation
- manual retry and test send

Cron:

- create/update/delete/list
- human schedule parser
- manual trigger
- run history endpoints

Storage:

- upload/upload-many/upload-from-url
- file list/get/update/delete
- signed URL generation (mock style)
- folder listing/create (virtual)

Realtime token:

- token endpoint creates JWT for realtime subscriptions.

### 4.6 Quotas and Limits

- Plan limits include free/pro/team defaults.
- Middleware checks API/doc/realtime availability.
- Upgrade hints returned in error payloads.

## 5. Worker System (apps/cron)

### 5.1 Core Responsibilities

- Execute due cron jobs.
- Deliver webhooks with retries.
- Update run/delivery state in Postgres.

### 5.2 Queue Runtime

- BullMQ queues:
  - paperdb:cron
  - paperdb:webhook
- Redis connection with dedicated worker concurrency.
- cron-parser used for next-run calculations.

### 5.3 Current Strength

- Real execution path for HTTP-type cron actions.
- Structured status updates to cron_runs/webhook_deliveries.
- Graceful shutdown handling.

## 6. Realtime System (apps/realtime)

### 6.1 Core Behavior

- Node ws server validates JWT token from query string.
- Client subscriptions are channel-based.
- Redis pattern subscription paperdb:\* for fanout.

### 6.2 Current Constraints

- Token payload contract currently expects dbId + collections array.
- Subscription message contract expects action=subscribe and full paperdb:<dbId>:<collection> channels.

## 7. Dashboard / Control Plane (apps/web)

### 7.1 Core Features

- better-auth for dashboard users.
- social auth providers configured (Google/GitHub) in web auth stack.
- plan and subscription updates via Polar plugin hooks.
- create/list databases and default API key issuance.
- usage endpoint for plan consumption metrics.
- docs pages and marketing pages.

### 7.2 Data Model Signals

- better-auth migration SQLs include user/session/account/verification.
- additional tables: subscription, monthly_usage, plan_limits.

## 8. SDK (packages/sdks/notdb)

### 8.1 Surface Area

Exports feature clients for:

- auth
- webhooks
- cron
- storage
- search
- sync
- realtime helper methods

Supports schema-based typed collection clients and multi-format builds.

### 8.2 Current Maturity

- Core CRUD methods exist and call API routes.
- Auth client has broad interface including oauth/magic-link/reset methods.
- Search and sync modules are implemented on SDK side, but rely on backend routes that are not present in API today.

## 9. React SDK (packages/sdks/notdb-react)

- Provider/context setup exists.
- Hooks for auth/collections/realtime exist.
- UI components exist: SignIn, SignUp, UserButton, guards.

This package is usable as a base, but should be validated against end-to-end API compatibility before production promotion.

## 10. CLI (packages/cli)

- Interactive create-paperdb CLI exists.
- Generates config/schema/client/bootstrap files.
- Supports framework selection and feature toggles.

The generated templates should be reconciled with actual available backend endpoints and SDK contract.

## 11. Data and Migration State

Important reality:

- Only 002_extended_features.sql exists in apps/api/migrations.
- Base schema creation currently lives inside apps/api/scripts/migrate-from-turso.ts.
- There is no formal migration tracking table + deterministic migration runner in current API package.

## 12. Security and Reliability Posture (Current)

Strengths:

- non-root containers for key services
- auth hashing and token usage
- webhook signing

Gaps in current defaults:

- open CORS configuration
- default secrets in environment fallbacks
- no unified request validation layer across routes
- no test suite in repository

## 13. Usability Assessment

### 13.1 What works well for users now

- Single-repo setup and quick local boot path.
- Clear conceptual API for frontend-first builders.
- Good feature ambition and product framing.
- Dashboard + API + worker + realtime split is logically sound.

### 13.2 Current friction points

- Feature contract mismatches across API/SDK/realtime.
- Claims in top-level docs exceed currently reliable behavior.
- Migration/bootstrap path is not yet production-safe.
- Missing tests and formal API contract docs reduce trust for external adopters.

## 14. Practical Conclusion

PaperDB today is a strong pre-production platform foundation, not yet a fully coherent production BaaS replacement.

Best characterization:

- Architecture: solid
- Feature breadth: strong
- Contract consistency: needs immediate stabilization
- Production readiness: partial, with critical blockers that are fixable in phased execution
