# PaperDB System Documentation

**Last updated:** 2026-04-30

This document describes the current PaperDB V1 system as it exists in the repository today.

It is the architecture reference for the monorepo, not a roadmap. If a capability is not listed here, treat it as not part of the current public contract.

## 1. Executive Summary

PaperDB is a pnpm + Turbo monorepo that delivers a frontend-first backend platform with:

- auth
- document CRUD
- bulk insert and count
- schema management
- storage metadata and upload flows
- webhooks
- cron
- realtime
- a dashboard and docs site
- a TypeScript SDK and React bindings
- a create-paperdb CLI scaffold

The system is intentionally split into a public API, a background worker, a realtime websocket service, and a control plane/dashboard app.

## 2. Monorepo Layout

### Applications

- `apps/api` - canonical Hono API for data and platform routes
- `apps/cron` - BullMQ worker for cron execution and webhook deliveries
- `apps/realtime` - websocket fanout service for live collection events
- `apps/web` - Next.js dashboard, marketing pages, and docs site

### Packages

- `packages/sdks/notdb` - core JavaScript/TypeScript SDK published as `paperdb`
- `packages/sdks/notdb-react` - React bindings and UI helpers
- `packages/cli` - `create-paperdb` scaffolding CLI
- shared config and UI packages

## 3. Service Topology

### 3.1 Public API

The API is the canonical V1 contract.

Responsibilities:

- auth routes
- collection document routes
- bulk insert and count
- schema persistence and retrieval
- webhooks
- cron
- storage
- realtime token generation
- health and OpenAPI endpoints
- logging, validation, and rate limiting

### 3.2 Worker

The worker is responsible for background execution.

Responsibilities:

- cron job execution
- webhook delivery retries
- status persistence in PostgreSQL
- queue processing with Redis and BullMQ

### 3.3 Realtime Service

The realtime service is a standalone websocket process.

Responsibilities:

- validate realtime tokens
- accept subscribe messages from SDK clients
- fan out collection events through Redis pub/sub
- map short collection names to the tenant-scoped channel format used by the service

### 3.4 Control Plane

The web app is the dashboard and documentation surface.

Responsibilities:

- authentication for dashboard users
- database creation and listing
- usage reporting
- plan and billing hooks
- docs and marketing pages

## 4. Infrastructure Dependencies

PaperDB V1 expects:

- PostgreSQL for primary state
- Redis for pub/sub, queues, and rate limiting
- object storage for the next storage phase

Local ports used by the default stack:

| Service  | Port | Notes              |
| -------- | ---- | ------------------ |
| Web      | 6565 | Next.js dev server |
| API      | 3001 | Canonical HTTP API |
| Realtime | 3002 | Websocket service  |

## 5. Contract Truth

### 5.1 Auth

Working today:

- sign-up
- sign-in
- sign-out
- session lookup
- session refresh
- profile update
- password change
- OAuth redirect/callback routes for Google and GitHub

Not yet public as a supported platform promise:

- magic-link auth
- password reset flows

### 5.2 Collections and CRUD

Working today:

- list documents
- get a document by id
- create a document
- update a document
- delete a document
- bulk insert
- count documents
- read and save schema

The document routes use the verified V1 query and body conventions described in the API OpenAPI document.

### 5.3 Storage

Working today:

- upload
- upload-many
- upload-from-url
- list files
- get file metadata
- update metadata
- delete file
- list folders
- create folders
- signed URL generation for file access

Still not a platform promise:

- move/rename helpers
- copy helpers
- delete-folder helpers
- a fully integrated object-storage implementation with production bucket wiring

### 5.4 Webhooks and Cron

Working today:

- create, update, delete, list
- delivery and retry history
- manual webhook tests
- cron creation and manual triggers
- cron run history

### 5.5 Realtime

Working today:

- realtime token generation from the API
- websocket subscribe contract in the realtime service
- event fanout through Redis

The important detail is that the SDK and realtime service now use the same channel naming rules for the V1 flow.

### 5.6 Search and Sync

The SDK contains search and sync helpers, but the backend contract is not yet fully published for those flows.

Treat them as future capability work, not as a guaranteed public surface.

## 6. Runtime Behavior

### Request Flow

1. The client SDK sends a request to `apps/api`.
2. The API validates the payload.
3. The API writes to PostgreSQL and, where needed, publishes queue or realtime events.
4. The worker consumes queue jobs from Redis and persists outcomes.
5. The realtime service subscribes to Redis pub/sub and forwards collection events to websocket clients.
6. The dashboard uses its own control-plane routes to manage account and workspace state.

### Observability

The API now exposes:

- request IDs
- structured JSON logs
- a health check that probes PostgreSQL and Redis
- an OpenAPI document at `/openapi.json`

## 7. Reliability Posture

Strengths:

- strict route-level validation on write operations
- rate limiting per API key and per IP
- migration runner with a formal baseline
- integration tests for the primary onboarding flows
- health checks that report actual dependency state

Remaining gaps:

- production object storage integration
- explicit load validation for realtime, cron, and webhook retries
- broader contract testing around future SDK helpers

## 8. How To Read This Repository

If you are trying to understand the codebase quickly, use this order:

1. [docs/README.md](README.md)
2. [docs/01_SYSTEM_DOCUMENTATION.md](01_SYSTEM_DOCUMENTATION.md)
3. [docs/02_GAPS_AND_IMPROVEMENTS.md](02_GAPS_AND_IMPROVEMENTS.md)
4. [PRODUCTION_READINESS.md](../PRODUCTION_READINESS.md)
5. [docs/progress.md](progress.md)

That sequence goes from the current state to the remaining work.
