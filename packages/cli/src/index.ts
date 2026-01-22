#!/usr/bin/env node

import * as p from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import ora from "ora";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ProjectConfig {
  name: string;
  framework: "react" | "vue" | "svelte" | "vanilla";
  authProviders: string[];
  features: string[];
}

const program = new Command();

program
  .name("create-paperdb")
  .description("Create a new PaperDB project")
  .version("1.0.0")
  .argument("[project-name]", "Name of your project")
  .action(async (projectName?: string) => {
    console.log("");
    p.intro(chalk.bgCyan.black(" create-paperdb "));

    const config = await gatherProjectConfig(projectName);
    await createProject(config);

    p.outro(chalk.green("🎉 Your PaperDB project is ready!"));

    console.log("");
    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.gray(`  cd ${config.name}`));
    console.log(chalk.gray("  npm install"));
    console.log(chalk.gray("  npm run dev"));
    console.log("");
    console.log(chalk.dim("📚 Documentation: https://paperdb.dev/docs"));
    console.log("");
  });

async function gatherProjectConfig(
  initialName?: string,
): Promise<ProjectConfig> {
  const name =
    initialName ||
    ((await p.text({
      message: "What is your project name?",
      placeholder: "my-paperdb-app",
      validate: (value) => {
        if (!value) return "Project name is required";
        if (!/^[a-z0-9-_]+$/i.test(value))
          return "Project name can only contain letters, numbers, hyphens, and underscores";
        return undefined;
      },
    })) as string);

  if (p.isCancel(name)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const framework = (await p.select({
    message: "Which framework are you using?",
    options: [
      { value: "react", label: "React / Next.js", hint: "recommended" },
      { value: "vue", label: "Vue / Nuxt" },
      { value: "svelte", label: "Svelte / SvelteKit" },
      { value: "vanilla", label: "Vanilla JavaScript", hint: "CDN script" },
    ],
  })) as ProjectConfig["framework"];

  if (p.isCancel(framework)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const authProviders = (await p.multiselect({
    message: "Which authentication providers do you want to enable?",
    options: [
      { value: "email", label: "Email & Password", hint: "always included" },
      { value: "google", label: "Google OAuth" },
      { value: "github", label: "GitHub OAuth" },
      { value: "apple", label: "Apple OAuth" },
      { value: "magic-link", label: "Magic Link (Passwordless)" },
    ],
    required: false,
    initialValues: ["email"],
  })) as string[];

  if (p.isCancel(authProviders)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const features = (await p.multiselect({
    message: "Which features do you need?",
    options: [
      {
        value: "realtime",
        label: "Realtime Subscriptions",
        hint: "live updates",
      },
      {
        value: "webhooks",
        label: "Webhooks",
        hint: "HTTP callbacks on events",
      },
      { value: "cron", label: "Cron Jobs", hint: "scheduled tasks" },
      {
        value: "storage",
        label: "File Storage",
        hint: "upload images & files",
      },
      { value: "search", label: "Full-Text Search" },
      {
        value: "offline",
        label: "Offline Sync",
        hint: "works without internet",
      },
    ],
    required: false,
    initialValues: ["realtime"],
  })) as string[];

  if (p.isCancel(features)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  return {
    name,
    framework,
    authProviders,
    features,
  };
}

async function createProject(config: ProjectConfig) {
  const spinner = ora("Creating project...").start();

  const projectPath = path.resolve(process.cwd(), config.name);

  // Create project directory
  await fs.ensureDir(projectPath);

  // Create package.json
  const packageJson = generatePackageJson(config);
  await fs.writeJSON(path.join(projectPath, "package.json"), packageJson, {
    spaces: 2,
  });

  // Create paperdb.config.ts
  const configFile = generateConfigFile(config);
  await fs.writeFile(path.join(projectPath, "paperdb.config.ts"), configFile);

  // Create schema file
  const schemaFile = generateSchemaFile(config);
  await fs.writeFile(
    path.join(projectPath, "src", "db", "schema.ts"),
    schemaFile,
  );

  // Create db client file
  const clientFile = generateClientFile(config);
  await fs.writeFile(
    path.join(projectPath, "src", "db", "index.ts"),
    clientFile,
  );

  // Create .env.example
  const envExample = generateEnvExample(config);
  await fs.writeFile(path.join(projectPath, ".env.example"), envExample);

  // Create .gitignore
  const gitignore = generateGitignore();
  await fs.writeFile(path.join(projectPath, ".gitignore"), gitignore);

  // Create framework-specific files
  if (config.framework === "react") {
    await createReactFiles(projectPath, config);
  } else if (config.framework === "vue") {
    await createVueFiles(projectPath, config);
  } else if (config.framework === "svelte") {
    await createSvelteFiles(projectPath, config);
  } else {
    await createVanillaFiles(projectPath, config);
  }

  spinner.succeed("Project created successfully!");
}

function generatePackageJson(config: ProjectConfig): object {
  const base: Record<string, unknown> = {
    name: config.name,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      paperdb: "latest",
    },
    devDependencies: {
      typescript: "^5.3.0",
      vite: "^5.0.0",
    },
  };

  if (config.framework === "react") {
    base.dependencies = {
      ...(base.dependencies as object),
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "@paperdb/react": "latest",
    };
    base.devDependencies = {
      ...(base.devDependencies as object),
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@vitejs/plugin-react": "^4.2.0",
    };
  } else if (config.framework === "vue") {
    base.dependencies = {
      ...(base.dependencies as object),
      vue: "^3.4.0",
      "@paperdb/vue": "latest",
    };
    base.devDependencies = {
      ...(base.devDependencies as object),
      "@vitejs/plugin-vue": "^5.0.0",
    };
  } else if (config.framework === "svelte") {
    base.dependencies = {
      ...(base.dependencies as object),
      svelte: "^4.2.0",
      "@paperdb/svelte": "latest",
    };
    base.devDependencies = {
      ...(base.devDependencies as object),
      "@sveltejs/vite-plugin-svelte": "^3.0.0",
    };
  }

  return base;
}

function generateConfigFile(config: ProjectConfig): string {
  return `import { defineConfig } from "paperdb";

export default defineConfig({
  // Your PaperDB API key (use environment variable in production)
  apiKey: process.env.PAPERDB_API_KEY,

  // Authentication providers
  auth: {
    providers: ${JSON.stringify(config.authProviders, null, 6).replace(/\n/g, "\n    ")},
  },

  // Enabled features
  features: {
    realtime: ${config.features.includes("realtime")},
    webhooks: ${config.features.includes("webhooks")},
    cron: ${config.features.includes("cron")},
    storage: ${config.features.includes("storage")},
    search: ${config.features.includes("search")},
    offlineSync: ${config.features.includes("offline")},
  },
});
`;
}

function generateSchemaFile(config: ProjectConfig): string {
  return `import { defineSchema, collection, field } from "paperdb";

/**
 * Define your database schema here.
 * This provides type safety and enables features like validation,
 * full-text search, and auto-generated APIs.
 */
export const schema = defineSchema({
  // Example: Users collection
  users: collection({
    name: field.string().required(),
    email: field.string().required().unique(),
    avatar: field.string().optional(),
    role: field.enum(["user", "admin"]).default("user"),
    createdAt: field.timestamp().default("now"),
    ${config.features.includes("search") ? '// Enable full-text search on name and email\n    _searchable: ["name", "email"],' : ""}
    ${config.features.includes("offline") ? "// Enable offline sync for this collection\n    _offlineSync: true," : ""}
  }),

  // Example: Posts collection
  posts: collection({
    title: field.string().required(),
    content: field.string().required(),
    authorId: field.string().required(), // Reference to users
    published: field.boolean().default(false),
    tags: field.array(field.string()),
    createdAt: field.timestamp().default("now"),
    updatedAt: field.timestamp().default("now"),
    ${config.features.includes("search") ? '_searchable: ["title", "content"],' : ""}
  }),

  // Add more collections as needed...
});

export type Schema = typeof schema;
`;
}

function generateClientFile(config: ProjectConfig): string {
  return `import { createClient } from "paperdb";
import { schema } from "./schema";

/**
 * Initialize PaperDB client with your schema.
 * This gives you full type safety for all operations.
 */
export const db = createClient({
  apiKey: process.env.PAPERDB_API_KEY!,
  // Use public key for browser-side operations
  // publicKey: process.env.PAPERDB_PUBLIC_KEY,
  schema,
});

// Export typed collections for easy access
export const { users, posts } = db;

/**
 * Usage Examples:
 * 
 * // Create a user
 * const user = await users.insert({
 *   name: "John Doe",
 *   email: "john@example.com",
 * });
 * 
 * // Query users
 * const admins = await users.find({
 *   where: { role: "admin" },
 *   orderBy: { createdAt: "desc" },
 *   limit: 10,
 * });
 * 
 * // Update a user
 * await users.update(user.id, { role: "admin" });
 * 
 * // Delete a user
 * await users.delete(user.id);
 * 
 * // Realtime subscription
 * users.subscribe({ where: { role: "admin" } }, (user) => {
 *   console.log("Admin updated:", user);
 * });
 */
`;
}

function generateEnvExample(config: ProjectConfig): string {
  let env = `# PaperDB Configuration
# Get your API keys at https://paperdb.dev/dashboard

# Secret key - use only on server-side (never expose in browser)
PAPERDB_API_KEY=sk_live_xxxxxxxxxxxxx

# Public key - safe to use in browser (with limited permissions)
PAPERDB_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
`;

  if (config.authProviders.includes("google")) {
    env += `
# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
`;
  }

  if (config.authProviders.includes("github")) {
    env += `
# GitHub OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
`;
  }

  return env;
}

function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/
.nuxt/
.svelte-kit/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
`;
}

async function createReactFiles(
  projectPath: string,
  config: ProjectConfig,
): Promise<void> {
  // Create vite.config.ts
  await fs.writeFile(
    path.join(projectPath, "vite.config.ts"),
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
  );

  // Create index.html
  await fs.writeFile(
    path.join(projectPath, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  );

  // Create main.tsx
  await fs.writeFile(
    path.join(projectPath, "src", "main.tsx"),
    `import React from "react";
import ReactDOM from "react-dom/client";
import { PaperDBProvider } from "@paperdb/react";
import { db } from "./db";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PaperDBProvider client={db}>
      <App />
    </PaperDBProvider>
  </React.StrictMode>
);
`,
  );

  // Create App.tsx
  await fs.writeFile(
    path.join(projectPath, "src", "App.tsx"),
    `import { useAuth, SignedIn, SignedOut, SignIn, UserButton } from "@paperdb/react";
import { useCollection } from "@paperdb/react";
import { posts } from "./db";

export default function App() {
  const { user } = useAuth();
  const { data: recentPosts, isLoading } = useCollection(posts, {
    where: { published: true },
    orderBy: { createdAt: "desc" },
    limit: 10,
  });

  return (
    <div className="app">
      <header>
        <h1>Welcome to ${config.name}</h1>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignIn />
        </SignedOut>
      </header>

      <main>
        <SignedIn>
          <p>Hello, {user?.name}!</p>
          
          <h2>Recent Posts</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <ul>
              {recentPosts?.map((post) => (
                <li key={post.id}>{post.title}</li>
              ))}
            </ul>
          )}
        </SignedIn>

        <SignedOut>
          <p>Please sign in to continue.</p>
        </SignedOut>
      </main>
    </div>
  );
}
`,
  );

  // Create index.css
  await fs.writeFile(
    path.join(projectPath, "src", "index.css"),
    `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  color: #333;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.5rem;
}

h2 {
  font-size: 1.25rem;
  margin: 1.5rem 0 1rem;
}

ul {
  list-style: none;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
`,
  );

  // Create tsconfig.json
  await fs.writeFile(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
}

async function createVueFiles(
  projectPath: string,
  config: ProjectConfig,
): Promise<void> {
  // Create vite.config.ts
  await fs.writeFile(
    path.join(projectPath, "vite.config.ts"),
    `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
`,
  );

  // Create index.html
  await fs.writeFile(
    path.join(projectPath, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  );

  // Create main.ts
  await fs.writeFile(
    path.join(projectPath, "src", "main.ts"),
    `import { createApp } from "vue";
import { createPaperDB } from "@paperdb/vue";
import { db } from "./db";
import App from "./App.vue";
import "./index.css";

const app = createApp(App);
app.use(createPaperDB(db));
app.mount("#app");
`,
  );

  // Create App.vue
  await fs.writeFile(
    path.join(projectPath, "src", "App.vue"),
    `<script setup lang="ts">
import { useAuth, useCollection } from "@paperdb/vue";
import { posts } from "./db";

const { user, isAuthenticated, signIn, signOut } = useAuth();
const { data: recentPosts, isLoading } = useCollection(posts, {
  where: { published: true },
  orderBy: { createdAt: "desc" },
  limit: 10,
});
</script>

<template>
  <div class="app">
    <header>
      <h1>Welcome to ${config.name}</h1>
      <button v-if="isAuthenticated" @click="signOut">Sign Out</button>
      <button v-else @click="signIn">Sign In</button>
    </header>

    <main>
      <template v-if="isAuthenticated">
        <p>Hello, {{ user?.name }}!</p>
        
        <h2>Recent Posts</h2>
        <p v-if="isLoading">Loading...</p>
        <ul v-else>
          <li v-for="post in recentPosts" :key="post.id">
            {{ post.title }}
          </li>
        </ul>
      </template>

      <p v-else>Please sign in to continue.</p>
    </main>
  </div>
</template>

<style scoped>
/* Styles */
</style>
`,
  );

  // Create index.css
  await fs.writeFile(
    path.join(projectPath, "src", "index.css"),
    `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  color: #333;
}
`,
  );
}

async function createSvelteFiles(
  projectPath: string,
  config: ProjectConfig,
): Promise<void> {
  // Create vite.config.ts
  await fs.writeFile(
    path.join(projectPath, "vite.config.ts"),
    `import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
});
`,
  );

  // Create index.html
  await fs.writeFile(
    path.join(projectPath, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.name}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  );

  // Create main.ts
  await fs.writeFile(
    path.join(projectPath, "src", "main.ts"),
    `import App from "./App.svelte";
import { initPaperDB } from "@paperdb/svelte";
import { db } from "./db";
import "./index.css";

initPaperDB(db);

const app = new App({
  target: document.getElementById("app")!,
});

export default app;
`,
  );

  // Create App.svelte
  await fs.writeFile(
    path.join(projectPath, "src", "App.svelte"),
    `<script lang="ts">
  import { auth, collection } from "@paperdb/svelte";
  import { posts } from "./db";

  const user = auth.user;
  const recentPosts = collection(posts, {
    where: { published: true },
    orderBy: { createdAt: "desc" },
    limit: 10,
  });
</script>

<div class="app">
  <header>
    <h1>Welcome to ${config.name}</h1>
    {#if $user}
      <button on:click={() => auth.signOut()}>Sign Out</button>
    {:else}
      <button on:click={() => auth.signIn()}>Sign In</button>
    {/if}
  </header>

  <main>
    {#if $user}
      <p>Hello, {$user.name}!</p>
      
      <h2>Recent Posts</h2>
      {#if $recentPosts.isLoading}
        <p>Loading...</p>
      {:else}
        <ul>
          {#each $recentPosts.data as post}
            <li>{post.title}</li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p>Please sign in to continue.</p>
    {/if}
  </main>
</div>

<style>
  /* Styles */
</style>
`,
  );
}

async function createVanillaFiles(
  projectPath: string,
  config: ProjectConfig,
): Promise<void> {
  // Create index.html with CDN script
  await fs.writeFile(
    path.join(projectPath, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.name}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="app">
      <header>
        <h1>Welcome to ${config.name}</h1>
        <div id="auth-container"></div>
      </header>

      <main>
        <div id="user-greeting"></div>
        <h2>Recent Posts</h2>
        <ul id="posts-list">
          <li>Loading...</li>
        </ul>
      </main>
    </div>

    <!-- PaperDB CDN Script -->
    <script src="https://cdn.paperdb.dev/v1/paperdb.min.js"></script>
    <script src="app.js"></script>
  </body>
</html>
`,
  );

  // Create app.js
  await fs.writeFile(
    path.join(projectPath, "app.js"),
    `// Initialize PaperDB
const db = PaperDB.createClient({
  publicKey: "YOUR_PUBLIC_KEY", // Get from https://paperdb.dev/dashboard
});

// Collection references
const users = db.collection("users");
const posts = db.collection("posts");

// Auth state
db.auth.onAuthStateChange((user) => {
  updateUI(user);
});

// Update UI based on auth state
function updateUI(user) {
  const authContainer = document.getElementById("auth-container");
  const userGreeting = document.getElementById("user-greeting");

  if (user) {
    authContainer.innerHTML = \`
      <button onclick="signOut()">\${user.name} (Sign Out)</button>
    \`;
    userGreeting.innerHTML = \`<p>Hello, \${user.name}!</p>\`;
    loadPosts();
  } else {
    authContainer.innerHTML = \`
      <button onclick="showSignIn()">Sign In</button>
    \`;
    userGreeting.innerHTML = "<p>Please sign in to continue.</p>";
  }
}

// Auth functions
async function showSignIn() {
  try {
    await db.auth.signIn();
  } catch (error) {
    console.error("Sign in failed:", error);
  }
}

async function signOut() {
  await db.auth.signOut();
}

// Load posts
async function loadPosts() {
  const postsList = document.getElementById("posts-list");
  
  try {
    const result = await posts.find({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      limit: 10,
    });

    postsList.innerHTML = result.data
      .map((post) => \`<li>\${post.title}</li>\`)
      .join("");
  } catch (error) {
    postsList.innerHTML = "<li>Error loading posts</li>";
    console.error("Failed to load posts:", error);
  }
}

// Subscribe to realtime updates
posts.subscribe({ where: { published: true } }, (change) => {
  console.log("Post updated:", change);
  loadPosts(); // Reload on any change
});

// Initialize
updateUI(null);
`,
  );

  // Create styles.css
  await fs.writeFile(
    path.join(projectPath, "styles.css"),
    `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  color: #333;
}

.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 1.5rem;
}

h2 {
  font-size: 1.25rem;
  margin: 1.5rem 0 1rem;
}

button {
  padding: 0.5rem 1rem;
  background: #0070f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0051a8;
}

ul {
  list-style: none;
}

li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
`,
  );
}

program.parse();
