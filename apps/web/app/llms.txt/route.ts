import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Generate a text file containing all PaperDB documentation
export async function GET() {
  // Try to read from the actual docs directory if possible,
  // or return a hardcoded/compiled representation of the V1 API.
  
  const content = `# PaperDB Documentation for AI

PaperDB is a schema-guided backend platform for teams that want a modern control plane.

## 1. CLI (create-paperdb)

Scaffold a new project quickly:
\`\`\`bash
npx create-paperdb@latest
\`\`\`
This creates a Next.js/TypeScript project with the PaperDB SDK pre-configured.

## 2. Installation

Install the SDK manually:
\`\`\`bash
npm install paperdb
\`\`\`

## 3. Authentication

Initialize and authenticate:
\`\`\`typescript
import { createClient } from "paperdb";

const db = createClient({
  url: "https://api.paperdb.io",
  apiKey: "YOUR_API_KEY",
});

// Email/Password login
const { user, session } = await db.auth.signIn({
  email: "user@example.com",
  password: "securepassword"
});
\`\`\`

## 3. Databases and Collections

Databases act as tenants. Collections store JSON documents.
Collections require a schema:
\`\`\`typescript
const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    published: { type: "boolean" }
  },
  required: ["title"]
};

// Assuming the collection 'posts' exists and matches the schema
\`\`\`

## 4. CRUD Operations

### Create
\`\`\`typescript
const result = await db.collection('posts').insert({
  title: "My first post",
  published: true
});
\`\`\`

### Read
\`\`\`typescript
const { data, error } = await db.collection('posts')
  .select('*')
  .eq('published', true)
  .execute();
\`\`\`

### Update
\`\`\`typescript
const result = await db.collection('posts')
  .update({ published: false })
  .eq('id', 'post_123')
  .execute();
\`\`\`

### Delete
\`\`\`typescript
const result = await db.collection('posts')
  .delete()
  .eq('id', 'post_123')
  .execute();
\`\`\`

## 5. Advanced Features

### Webhooks
Configure webhooks in the dashboard to listen to collection events (INSERT, UPDATE, DELETE).

### Realtime
Subscribe to live changes:
\`\`\`typescript
const subscription = db.collection('posts')
  .on('INSERT', (payload) => {
    console.log('New post!', payload.new);
  })
  .subscribe();
\`\`\`

### Cron
Schedule tasks:
\`\`\`bash
curl -X POST https://api.paperdb.io/cron \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Daily task",
    "schedule": "0 0 * * *",
    "action": { "type": "http", "method": "POST", "url": "https://yourapi.com" }
  }'
\`\`\`

### Storage
Upload files:
\`\`\`typescript
const file = document.getElementById('file-input').files[0];
const { data, error } = await db.storage.upload('avatars/user_1.png', file);
\`\`\`
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
