# PaperDB Gaps and Improvements

**Last updated:** 2026-04-30

This document is the current list of unresolved work and the next sensible improvements after the V1 contract cleanup.

## 1. Confirmed Fixed

These issues were present in earlier reviews and are now resolved in the current codebase:

- CORS is restricted through `CORS_ORIGINS`.
- Secret fallbacks for auth and realtime were removed or hardened.
- The realtime subscribe contract now matches the SDK and websocket service.
- API routes use the unified postgres.js client path.
- The migration baseline and migration runner exist.
- Write endpoints are validated with Zod.
- Rate limiting is active.
- OAuth redirect/callback routes exist.
- Structured logging is in place.
- Health checks probe PostgreSQL and Redis.
- OpenAPI is published at `/openapi.json`.
- The integration suite covers the main onboarding paths.

## 2. Still Open

### 2.1 Storage backend integration

The storage API currently supports metadata and file workflows, but the production object-storage layer still needs full bucket-backed integration.

What remains:

- replace the mock/simplified upload backing with real bucket storage
- wire presigned URL generation to the final object backend
- document lifecycle behavior for public and private files

Why it matters:

- storage is part of the public contract, so the backend must not feel simulated in production

### 2.2 Search contract

The SDK exposes search helpers, but the backend route contract is not yet a production guarantee.

What remains:

- define the backend search surface
- decide how indexing is created and refreshed
- document the supported query model before treating search as a public feature

### 2.3 Magic-link and reset-password auth

The current platform supports session-based auth and OAuth routes, but passwordless and reset flows are still not a first-class public promise.

What remains:

- decide whether the flows are in V1.1 or later
- add backend routes if they are to be supported
- align SDK helpers and documentation only after the backend exists

### 2.4 Advanced storage helpers

The SDK exposes helpers such as move/copy/folder deletion, but the backend does not yet provide a complete route contract for those operations.

What remains:

- decide whether to support them in the API or remove the helpers from the public promise
- avoid documenting operations that can 404 in a normal flow

### 2.5 Load validation

The codebase has integration coverage, but it still needs more confidence under real load.

What remains:

- soak tests for realtime connections
- webhook retry storm validation
- cron bursts and queue backlog testing
- storage upload stress tests once the object backend is final

## 3. Recommended Next Improvements

### 3.1 V1.1 hardening

- finish the storage backend integration
- add a documented search contract or remove the search promise from public docs
- settle the remaining auth flows
- add more production load tests

### 3.2 Contract safety nets

- add docs/SDK compatibility checks in CI
- publish a lightweight contract matrix for supported and unsupported helpers
- keep the OpenAPI document as the first place to verify behavior

### 3.3 Platform maturity

- add backup and restore runbooks
- add metrics and dashboards for queue depth and websocket load
- define a public deprecation policy for SDK helpers that are not yet backed by the server

## 4. Priority Summary

| Priority | Area                     | Reason                                             |
| -------- | ------------------------ | -------------------------------------------------- |
| P0       | Storage backend          | It is the largest visible gap in the core platform |
| P1       | Search contract          | The SDK surface must not outrun the server         |
| P1       | Remaining auth helpers   | They affect onboarding expectations                |
| P2       | Load validation          | Needed before broader external adoption            |
| P2       | Docs/SDK contract checks | Prevents drift from returning                      |

## 5. Operating Rule

If a capability is not backed by a real route and a test, do not present it as production ready.
