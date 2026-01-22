# PaperDB – frontend-friendly backend

PaperDB gives frontend builders an instant backend with auth, CRUD, storage, webhooks, cron, search, and realtime. No deep backend knowledge needed.

## One-minute setup

```bash
npx create-paperdb@latest
```

Pick your framework (React/Vue/Svelte/Vanilla), choose auth providers, and we scaffold everything.

## Use the SDK

Install (Node, React, Vite, Next, etc.):

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

// Auth (Clerk-like)
await db.auth.signUp({ email: "hi@example.com", password: "strongpass" });
await db.auth.signIn({ email: "hi@example.com", password: "strongpass" });
const me = await db.auth.getUser();

// CRUD
const user = await db.users.insert({ name: "Mia", email: "mia@example.com" });
const list = await db.users.find({ filter: { name: "Mia" } });
await db.users.update(user.id, { name: "Mia Harper" });
await db.users.delete(user.id);

// Storage
const file = await db.storage.upload({
  file: new File(["hi"], "hello.txt"),
  folder: "docs",
});

// Webhooks
const hook = await db.webhooks.create({
  url: "https://example.com/webhook",
  events: ["users.created"],
});

// Cron
const job = await db.cron.create({
  name: "nightly-report",
  schedule: "daily at 2am",
  action: { type: "http", url: "https://example.com/report" },
});

// Realtime
const stop = db.realtime.subscribe("users", (event) => {
  console.log("change in users", event);
});
```

## Use in the browser (CDN)

```html
<script src="https://cdn.paperdb.dev/browser.global.js"></script>
<script>
  const db = PaperDB.createClient({ apiKey: "PUBLIC_KEY" });
  db.collection("messages").insert({ text: "Hello" });
</script>
```

## React components and hooks

```bash
pnpm add paperdb @paperdb/react
```

```tsx
import {
  PaperDBProvider,
  SignIn,
  SignUp,
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

## Key features (plain English)

- Auth that feels like Clerk/Auth.js (email+password, socials, sessions)
- CRUD with schemas (unique/required fields, validation)
- Webhooks with retries and signatures
- Cron jobs with human words ("every 5 minutes", "daily at 9am")
- Storage with public/private files and signed URLs
- Realtime subscriptions
- Search and offline sync (IndexedDB) ready for SPAs

## Run locally

```bash
pnpm install
pnpm --filter @paperdb/api dev   # API server
pnpm --filter @paperdb/web dev   # Dashboard/docs
pnpm --filter @paperdb/cron-worker dev  # Cron + webhook worker
```

Set env vars: `DATABASE_URL`, `REDIS_URL`, `PORT` (see apps/api/.env.example if present).

## Repo layout

- apps/api – Hono API
- apps/cron – BullMQ worker for cron + webhooks
- apps/web – Next.js dashboard/docs
- packages/sdks/notdb – Core SDK (paperdb)
- packages/sdks/notdb-react – React hooks/components

MIT License
