// Core client
export { createClient, ExtendedClientOptions } from "./client.js";
export type { SchemaDefinition } from "./types.js";

// Schema builder (for defineSchema pattern)
export {
  defineSchema,
  defineConfig,
  collection,
  field,
} from "./schema-builder.js";

// Feature modules
export { AuthClient } from "./auth.js";
export type {
  User,
  Session,
  AuthState,
  AuthProvider,
  SignUpOptions,
  SignInOptions,
} from "./auth.js";

export { WebhooksClient, createWebhookHandler } from "./webhooks.js";
export type {
  Webhook,
  WebhookEvent,
  WebhookDelivery,
  CreateWebhookOptions,
} from "./webhooks.js";

export { CronClient, parseSchedule, getNextRunDescription } from "./cron.js";
export type {
  CronJob,
  CronAction,
  CronRun,
  CreateCronJobOptions,
} from "./cron.js";

export { StorageClient } from "./storage.js";
export type {
  StorageFile,
  UploadOptions,
  ImageTransformOptions,
} from "./storage.js";

export { SearchClient, createHighlighter } from "./search.js";
export type {
  SearchResult,
  SearchOptions,
  SearchResponse,
  SearchHighlight,
} from "./search.js";

export { SyncClient } from "./sync.js";
export type {
  SyncConfig,
  SyncStatus,
  PendingChange,
  SyncConflict,
  ConflictResolutionStrategy,
} from "./sync.js";

// Crypto utilities
export {
  createHmac,
  createHmacAsync,
  verifyHmac,
  generateId,
} from "./crypto.js";
