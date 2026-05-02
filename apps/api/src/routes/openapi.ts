import { Hono } from "hono";

/**
 * GET /openapi.json
 * OpenAPI 3.1 specification for the PaperDB V1 API.
 * This is hand-maintained to keep it accurate; auto-generation can be
 * layered on top via @hono/zod-openapi in a future iteration.
 */
export const openapiRoutes = new Hono();

const spec = {
  openapi: "3.1.0",
  info: {
    title: "PaperDB API",
    version: "1.0.0",
    description:
      "Universal Backend-as-a-Service API. Manage documents, auth, webhooks, cron jobs, and file storage for any application.",
    contact: { url: "https://paperdb.dev" },
  },
  servers: [
    { url: "https://api.paperdb.dev", description: "Production" },
    { url: "http://localhost:3001", description: "Local development" },
  ],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Your PaperDB project API key",
      },
      BearerToken: {
        type: "http",
        scheme: "bearer",
        description: "SDK user session token (from sign-up / sign-in)",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          role: { type: "string" },
          emailVerified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Session: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          token: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
        },
      },
      Document: {
        type: "object",
        additionalProperties: true,
        properties: {
          _id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Webhook: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          collections: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          enabled: { type: "boolean" },
          description: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CronJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          schedule: { type: "string" },
          cronExpression: { type: "string" },
          timezone: { type: "string" },
          action: { type: "object" },
          enabled: { type: "boolean" },
          lastRunAt: { type: "string", format: "date-time", nullable: true },
          lastRunStatus: { type: "string", nullable: true },
          nextRunAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      File: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          originalName: { type: "string" },
          mimeType: { type: "string" },
          size: { type: "integer" },
          url: { type: "string", format: "uri" },
          cdnUrl: { type: "string", format: "uri" },
          path: { type: "string" },
          folder: { type: "string" },
          isPublic: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/": {
      get: {
        summary: "Health check",
        operationId: "getHealth",
        tags: ["System"],
        responses: {
          "200": {
            description: "API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    version: { type: "string", example: "1.0.0" },
                    db: { type: "string", example: "connected" },
                    redis: { type: "string", example: "connected" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    // ── Auth ─────────────────────────────────────────────────────────────────
    "/auth/sign-up": {
      post: {
        summary: "Create a new end-user account",
        operationId: "signUp",
        tags: ["Auth"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
          "400": { description: "Validation error" },
          "409": { description: "Email already in use" },
        },
      },
    },
    "/auth/sign-in": {
      post: {
        summary: "Sign in with email and password",
        operationId: "signIn",
        tags: ["Auth"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Signed in successfully" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/sign-out": {
      post: {
        summary: "Sign out and invalidate session",
        operationId: "signOut",
        tags: ["Auth"],
        security: [{ BearerToken: [] }],
        responses: { "200": { description: "Signed out" } },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user",
        operationId: "getMe",
        tags: ["Auth"],
        security: [{ BearerToken: [] }],
        responses: { "200": { description: "Current user" } },
      },
      patch: {
        summary: "Update user profile",
        operationId: "updateMe",
        tags: ["Auth"],
        security: [{ BearerToken: [] }],
        responses: { "200": { description: "Updated user" } },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh session token",
        operationId: "refreshSession",
        tags: ["Auth"],
        security: [{ BearerToken: [] }],
        responses: { "200": { description: "New session" } },
      },
    },
    "/auth/change-password": {
      post: {
        summary: "Change user password",
        operationId: "changePassword",
        tags: ["Auth"],
        security: [{ BearerToken: [] }],
        responses: { "200": { description: "Password changed" } },
      },
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request password reset email",
        operationId: "forgotPassword",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "If account exists, reset link is queued" },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset password with a valid token",
        operationId: "resetPassword",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "token", "newPassword"],
                properties: {
                  email: { type: "string", format: "email" },
                  token: { type: "string" },
                  newPassword: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password reset" },
          "400": { description: "Invalid token or payload" },
        },
      },
    },
    "/auth/oauth/{provider}": {
      get: {
        summary: "Initiate OAuth social login",
        operationId: "oauthRedirect",
        tags: ["Auth"],
        parameters: [
          {
            name: "provider",
            in: "path",
            required: true,
            schema: { type: "string", enum: ["google", "github"] },
          },
          {
            name: "apiKey",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          { name: "redirectTo", in: "query", schema: { type: "string" } },
        ],
        responses: { "302": { description: "Redirect to OAuth provider" } },
      },
    },
    // ── Documents ────────────────────────────────────────────────────────────
    "/{collection}/docs": {
      get: {
        summary: "List documents in a collection",
        operationId: "listDocs",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
          },
          { name: "sort", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Array of documents" } },
      },
      post: {
        summary: "Create a document",
        operationId: "createDoc",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "201": { description: "Document created" } },
      },
    },
    "/{collection}/docs/{id}": {
      get: {
        summary: "Get document by ID",
        operationId: "getDoc",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Document" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        summary: "Update document",
        operationId: "updateDoc",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Updated document" } },
      },
      delete: {
        summary: "Delete document",
        operationId: "deleteDoc",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/{collection}/bulk": {
      post: {
        summary: "Bulk insert documents",
        operationId: "bulkInsert",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "array", items: { type: "object" } },
            },
          },
        },
        responses: { "201": { description: "Inserted documents" } },
      },
    },
    "/{collection}/count": {
      get: {
        summary: "Count documents",
        operationId: "countDocs",
        tags: ["Documents"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Count result" } },
      },
    },
    "/{collection}/schema": {
      get: {
        summary: "Get collection schema",
        operationId: "getSchema",
        tags: ["Schema"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Schema definition" } },
      },
      post: {
        summary: "Save collection schema",
        operationId: "saveSchema",
        tags: ["Schema"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "collection",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Schema saved" } },
      },
    },
    // ── Realtime ─────────────────────────────────────────────────────────────
    "/realtime/token": {
      post: {
        summary: "Generate a realtime subscription token",
        operationId: "generateRealtimeToken",
        tags: ["Realtime"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  collection: { type: "string" },
                  collections: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Realtime token" } },
      },
    },
    // ── Webhooks ─────────────────────────────────────────────────────────────
    "/webhooks": {
      get: {
        summary: "List webhooks",
        operationId: "listWebhooks",
        tags: ["Webhooks"],
        security: [{ ApiKey: [] }],
        responses: { "200": { description: "Webhook list" } },
      },
      post: {
        summary: "Create a webhook",
        operationId: "createWebhook",
        tags: ["Webhooks"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url", "events"],
                properties: {
                  url: { type: "string", format: "uri" },
                  events: { type: "array", items: { type: "string" } },
                  collections: { type: "array", items: { type: "string" } },
                  description: { type: "string" },
                  enabled: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Webhook created" } },
      },
    },
    "/webhooks/{id}": {
      get: {
        summary: "Get webhook",
        operationId: "getWebhook",
        tags: ["Webhooks"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Webhook" } },
      },
      patch: {
        summary: "Update webhook",
        operationId: "updateWebhook",
        tags: ["Webhooks"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        summary: "Delete webhook",
        operationId: "deleteWebhook",
        tags: ["Webhooks"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    // ── Cron ─────────────────────────────────────────────────────────────────
    "/cron": {
      get: {
        summary: "List cron jobs",
        operationId: "listCronJobs",
        tags: ["Cron"],
        security: [{ ApiKey: [] }],
        responses: { "200": { description: "Cron job list" } },
      },
      post: {
        summary: "Create a cron job",
        operationId: "createCronJob",
        tags: ["Cron"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "schedule", "action"],
                properties: {
                  name: { type: "string" },
                  schedule: { type: "string", example: "every 5 minutes" },
                  timezone: { type: "string", default: "UTC" },
                  action: { type: "object" },
                  enabled: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Cron job created" } },
      },
    },
    // ── Storage ───────────────────────────────────────────────────────────────
    "/storage/upload": {
      post: {
        summary: "Upload a file",
        operationId: "uploadFile",
        tags: ["Storage"],
        security: [{ ApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                  folder: { type: "string" },
                  isPublic: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "File uploaded" } },
      },
    },
    "/storage/files": {
      get: {
        summary: "List files",
        operationId: "listFiles",
        tags: ["Storage"],
        security: [{ ApiKey: [] }],
        responses: { "200": { description: "File list" } },
      },
    },
    "/storage/files/{id}": {
      get: {
        summary: "Get file",
        operationId: "getFile",
        tags: ["Storage"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "File metadata" } },
      },
      delete: {
        summary: "Delete file",
        operationId: "deleteFile",
        tags: ["Storage"],
        security: [{ ApiKey: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
  },
  tags: [
    { name: "System", description: "Health and meta endpoints" },
    {
      name: "Auth",
      description: "End-user authentication and session management",
    },
    { name: "Documents", description: "Core document store operations" },
    { name: "Schema", description: "Collection schema management" },
    { name: "Realtime", description: "Realtime subscription token generation" },
    { name: "Webhooks", description: "Webhook CRUD and delivery management" },
    { name: "Cron", description: "Scheduled job management" },
    { name: "Storage", description: "File upload and management" },
  ],
};

openapiRoutes.get("/", (c) => c.json(spec));
