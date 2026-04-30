# PaperDB

PaperDB is a frontend-first backend platform for auth, document CRUD, storage metadata, webhooks, cron, realtime, and a dashboard/docs control plane.

The current V1 is production-oriented for the core platform paths: auth, CRUD, bulk/count, webhooks, cron, realtime, rate limiting, structured logging, and OpenAPI. Search, magic-link auth, password reset, and advanced storage operations are not backed end-to-end yet and should be treated as future work.

## Status Snapshot

| Area                        | Status  | Notes                                                                          |
| --------------------------- | ------- | ------------------------------------------------------------------------------ |
| Auth                        | Ready   | Email/password and OAuth routes are implemented                                |
| CRUD                        | Ready   | Document create/read/update/delete, bulk, count, schema                        |
| Webhooks                    | Ready   | CRUD, retries, deliveries, testing                                             |
| Cron                        | Ready   | Human-readable schedules and run history                                       |
| Realtime                    | Ready   | Token generation and websocket fanout                                          |
| Storage                     | Partial | File metadata and uploads work; real object storage integration is still gated |
| Search                      | Planned | SDK surface exists, backend routes are not public yet                          |
| Magic link / reset password | Planned | Not backed by API routes                                                       |
| Offline sync                | Planned | SDK module exists, but not a supported platform promise yet                    |

## Quick Start

```bash
pnpm install
```

Copy the environment examples into place and fill in your local values. The API expects at least `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGINS`, and the realtime worker expects `SOCKET_SECRET`.

If you want the entire workspace running locally:

```bash
pnpm dev
```

If you want the services individually:

```bash
pnpm --filter @paperdb/api migrate
pnpm --filter @paperdb/api dev
pnpm --filter @paperdb/web dev
pnpm --filter @paperdb/cron-worker dev
```

## SDK Usage

Install the core client:

```bash
pnpm add paperdb
```

```ts
import { createClient } from "paperdb";

const db = createClient({
  apiKey: "YOUR_API_KEY",
  schema: {
    users: {
      properties: {
        name: { type: "string", required: true },
        email: { type: "string", required: true, unique: true },
      },
    },
  },
});

await db.auth.signUp({ email: "hi@example.com", password: "strongpass" });
await db.auth.signIn({ email: "hi@example.com", password: "strongpass" });
await db.auth.getUser();

const user = await db.users.insert({ name: "Mia", email: "mia@example.com" });
await db.users.find({ filter: { name: "Mia" } });
await db.users.update(user.id, { name: "Mia Harper" });
await db.users.delete(user.id);

await db.storage.upload({
  file: new File(["hi"], "hello.txt"),
  folder: "docs",
});

await db.webhooks.create({
  url: "https://example.com/webhook",
  events: ["users.created"],
});

await db.cron.create({
  name: "nightly-report",
  schedule: "daily at 2am",
  action: { type: "http", url: "https://example.com/report" },
});

const stop = db.realtime.subscribe("users", (event) => {
  console.log("change in users", event);
});
```

## React

```bash
pnpm add paperdb @paperdb/react
```

```tsx
import {
  PaperDBProvider,
  SignIn,
  UserButton,
  useCollection,
} from "@paperdb/react";
import { createClient } from "paperdb";

const client = createClient({ apiKey: "PUBLIC_KEY" });

function Messages() {
  const { data, insert } = useCollection(client, "messages");

  return (
    <div>
      <button onClick={() => insert({ text: "hi" })}>Send</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default function App() {
  return (
    <PaperDBProvider client={client}>
      <SignIn />
      <Messages />
      <UserButton />
    </PaperDBProvider>
  );
}
```

## Documentation Map

- [Project documentation index](docs/README.md)
- [System documentation](docs/01_SYSTEM_DOCUMENTATION.md)
- [Gaps and improvements](docs/02_GAPS_AND_IMPROVEMENTS.md)
- [Implementation plan](docs/implementation_plan.md)
- [Production readiness](PRODUCTION_READINESS.md)

## Repository Layout

- `apps/api` - Hono API server
- `apps/cron` - BullMQ worker for cron and webhooks
- `apps/realtime` - websocket fanout service
- `apps/web` - dashboard and docs site
- `packages/sdks/notdb` - core SDK (`paperdb`)
- `packages/sdks/notdb-react` - React bindings

MIT License
