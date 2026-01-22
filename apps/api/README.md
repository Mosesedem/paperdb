# PaperDB API (Hono + Postgres)

Run the backend locally in three quick steps.

1. Install deps

```bash
pnpm install
```

2. Set env vars (copy .env.example if present)

- DATABASE_URL=postgres://...
- REDIS_URL=redis://...
- PORT=3001 (optional)

3. Start the API

```bash
pnpm --filter @paperdb/api dev
```

API will be available at http://localhost:3001

Workers (cron + webhooks retries):

```bash
pnpm --filter @paperdb/cron-worker dev
```

Dashboard/docs:

```bash
pnpm --filter @paperdb/web dev
```
