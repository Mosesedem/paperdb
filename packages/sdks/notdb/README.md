# PaperDB SDK

The core JavaScript and TypeScript SDK for PaperDB.

The SDK is strong for the platform paths that already exist in the API: auth, CRUD, storage metadata, webhooks, cron, and realtime. It also exposes search and sync helpers, but those backend capabilities are not fully published yet, so treat them as experimental until the API contract lands.

## Install

```bash
pnpm add paperdb
```

## Quick Start

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
await db.auth.signOut();

const user = await db.users.insert({ name: "Mia", email: "mia@example.com" });
await db.users.find({ filter: { name: "Mia" } });
await db.users.update(user.id, { name: "Mia Harper" });
await db.users.delete(user.id);

await db.storage.upload({
  file: new File(["hi"], "hello.txt"),
  folder: "docs",
});

await db.storage.uploadFromUrl("https://example.com/photo.png", {
  folder: "imports",
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
  console.log(event);
});
```

## React

```bash
pnpm add @paperdb/react
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

## Supported Today

| Area                                    | Ready   | Notes                                                           |
| --------------------------------------- | ------- | --------------------------------------------------------------- |
| Auth                                    | Yes     | Email/password, sessions, profile, password change              |
| CRUD                                    | Yes     | Schema-driven document methods                                  |
| Webhooks                                | Yes     | Create, list, update, delete, deliveries                        |
| Cron                                    | Yes     | Create, list, trigger, history                                  |
| Storage                                 | Yes     | Upload, upload-many, upload-from-url, list, get, update, delete |
| Realtime                                | Yes     | Token generation and websocket subscription                     |
| Search                                  | Not yet | SDK surface exists, backend routes are not public               |
| Sync                                    | Not yet | Module exists, contract is still being finalized                |
| Magic link / reset password             | Not yet | No backend routes to support them                               |
| Move/copy/delete-folder storage helpers | Not yet | Those helpers are not backed by API routes today                |

## Notes for Integrators

- Use a real `baseUrl` if you are not targeting the default production API.
- Set `realtimeUrl` when your websocket service is hosted separately from the API.
- Keep your examples aligned with the backend routes in [the API README](../../../apps/api/README.md) and [system docs](../../../docs/01_SYSTEM_DOCUMENTATION.md).
