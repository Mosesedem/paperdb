# PaperDB API

This package contains the canonical V1 Hono API for PaperDB.

The service is responsible for auth, collections, bulk/count/schema routes, webhooks, cron, storage metadata, realtime token generation, health checks, logging, rate limiting, and the OpenAPI document.

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

## Environment

Start by copying `apps/api/.env.example` and filling in the local values. The API expects at minimum:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`

The realtime service also expects `SOCKET_SECRET`. If you are testing OAuth, storage, or CDN flows, fill in the provider and object-storage variables documented in the example file.

## Local Workflow

```bash
pnpm install
pnpm --filter @paperdb/api migrate
pnpm --filter @paperdb/api dev
```

The API defaults to port `3001` in local development.

If you want the companion services as well:

```bash
pnpm --filter @paperdb/cron-worker dev
pnpm --filter @paperdb/web dev
```

Note: the cron package is named `@paperdb/cron-worker` in this workspace.

## Useful Scripts

| Script                               | Purpose                          |
| ------------------------------------ | -------------------------------- |
| `pnpm --filter @paperdb/api dev`     | Run the API in watch mode        |
| `pnpm --filter @paperdb/api migrate` | Apply the SQL migration baseline |
| `pnpm --filter @paperdb/api test`    | Run the API integration suite    |
| `pnpm --filter @paperdb/api build`   | Build the production bundle      |

## Canonical V1 Route Groups

| Area        | Routes                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health      | `GET /`, `GET /openapi.json`                                                                                                                                                                                                                             |
| Auth        | `POST /auth/sign-up`, `POST /auth/sign-in`, `POST /auth/sign-out`, `GET /auth/me`, `PATCH /auth/me`, `GET /auth/session`, `POST /auth/refresh`, `POST /auth/change-password`, `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback`          |
| Collections | `GET /:collection/docs`, `GET /:collection/docs/:id`, `POST /:collection/docs`, `PATCH /:collection/docs/:id`, `DELETE /:collection/docs/:id`, `POST /:collection/bulk`, `GET /:collection/count`, `GET /:collection/schema`, `POST /:collection/schema` |
| Realtime    | `POST /realtime/token`                                                                                                                                                                                                                                   |
| Webhooks    | `GET /webhooks`, `POST /webhooks`, `GET /webhooks/:id`, `PATCH /webhooks/:id`, `DELETE /webhooks/:id`, `POST /webhooks/:id/rotate-secret`, `GET /webhooks/:id/deliveries`, `POST /webhooks/:id/deliveries/:deliveryId/retry`, `POST /webhooks/:id/test`  |
| Cron        | `GET /cron`, `POST /cron`, `GET /cron/:id`, `PATCH /cron/:id`, `DELETE /cron/:id`, `POST /cron/:id/trigger`, `GET /cron/:id/runs`, `GET /cron/:id/runs/:runId`                                                                                           |
| Storage     | `POST /storage/upload`, `POST /storage/upload-many`, `POST /storage/upload-url`, `GET /storage`, `GET /storage/:id`, `PATCH /storage/:id`, `DELETE /storage/:id`, `POST /storage/:id/signed-url`, `GET /storage/folders`, `POST /storage/folders`        |

## What To Expect From the API

- JSON request validation is enforced on write routes.
- Rate limiting is enforced per API key and per IP.
- Responses include request IDs and structured logs.
- Health checks probe PostgreSQL and Redis.
- The OpenAPI document is published from the running API, so it should always reflect the server contract before you document it elsewhere.
