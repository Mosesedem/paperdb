# PaperDB SDK (JS/TS)

Frontend-friendly SDK with auth, CRUD, storage, webhooks, cron, search, realtime, and offline sync.

## Install

```bash
pnpm add paperdb
```

## Quick start (Node/React/Vite/Next)

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

// Auth
await db.auth.signUp({ email: "hi@example.com", password: "strongpass" });
await db.auth.signIn({ email: "hi@example.com", password: "strongpass" });
const me = await db.auth.getUser();

// CRUD
const user = await db.users.insert({ name: "Mia", email: "mia@example.com" });
const list = await db.users.find({ filter: { name: "Mia" } });
await db.users.update(user.id, { name: "Mia Harper" });
await db.users.delete(user.id);

// Storage
await db.storage.upload({
  file: new File(["hi"], "hello.txt"),
  folder: "docs",
});

// Webhooks
await db.webhooks.create({
  url: "https://example.com/webhook",
  events: ["users.created"],
});

// Cron
await db.cron.create({
  name: "nightly-report",
  schedule: "daily at 2am",
  action: { type: "http", url: "https://example.com/report" },
});

// Realtime
const stop = db.realtime.subscribe("users", (event) => console.log(event));
```

## CDN (vanilla JS)

```html
<script src="https://cdn.paperdb.dev/browser.global.js"></script>
<script>
  const db = PaperDB.createClient({ apiKey: "PUBLIC_KEY" });
  db.collection("messages").insert({ text: "Hello" });
</script>
```

## React components + hooks

```bash
pnpm add @paperdb/react
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

export function App() {
  return (
    <PaperDBProvider client={client}>
      <SignIn />
      <Messages />
      <UserButton />
    </PaperDBProvider>
  );
}
```

## What you get

- Auth (email/password + social) with sessions handled for you
- Schema-driven CRUD with validation, unique, required fields
- Webhooks with retries + signatures
- Cron jobs in plain English ("every 5 minutes")
- Storage with public/private files and signed URLs
- Realtime subscriptions
- Search + offline sync (IndexedDB) ready for SPAs

For full docs visit https://paperdb.dev/docs.
