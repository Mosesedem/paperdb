import {
  CreateClientOptions,
  SchemaDefinition,
  JSONSchema,
  InferSchemaProps,
  SelectFields,
  InferSelected,
  InsertSchemaProps,
  InferUpdateProps,
  InferFilterProps,
} from "./types.js";
import {
  getRequiredFields,
  getUniqueFields,
  applyDefaultValues,
} from "./utils.js";
import { AuthClient } from "./auth.js";
import { WebhooksClient } from "./webhooks.js";
import { CronClient } from "./cron.js";
import { StorageClient } from "./storage.js";
import { SearchClient } from "./search.js";
import { SyncClient, SyncConfig } from "./sync.js";

const DEFAULT_BASE_URL = "https://api.paperdb.dev";

export interface ExtendedClientOptions {
  apiKey?: string;
  publicKey?: string;
  schema?: SchemaDefinition;
  baseUrl?: string;
  sync?: SyncConfig;
}

function createRealtimeMethods(baseUrl: string, apiKey: string) {
  return {
    async generateToken(options?: {
      expiresIn?: string;
      collections?: string[];
    }): Promise<string> {
      const res = await fetch(`${baseUrl}/realtime/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options ?? {}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate realtime token");
      }

      const json = await res.json();
      return json.token;
    },

    /**
     * Subscribe to collection changes
     */
    subscribe(
      collection: string,
      callback: (event: { type: string; data: unknown }) => void,
      options?: { filter?: Record<string, unknown> },
    ): () => void {
      let ws: WebSocket | null = null;
      let isConnected = false;

      const connect = async () => {
        try {
          const token = await this.generateToken({ collections: [collection] });
          const wsUrl = baseUrl
            .replace("https://", "wss://")
            .replace("http://", "ws://");
          ws = new WebSocket(`${wsUrl}/realtime?token=${token}`);

          ws.onopen = () => {
            isConnected = true;
            ws?.send(
              JSON.stringify({
                type: "subscribe",
                channels: [`${collection}`],
              }),
            );
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.collection === collection) {
                callback(data);
              }
            } catch {
              // Ignore parse errors
            }
          };

          ws.onclose = () => {
            isConnected = false;
            // Reconnect after delay
            setTimeout(connect, 3000);
          };

          ws.onerror = () => {
            ws?.close();
          };
        } catch (error) {
          console.error("Realtime connection error:", error);
          setTimeout(connect, 5000);
        }
      };

      connect();

      // Return unsubscribe function
      return () => {
        if (ws) {
          ws.close();
          ws = null;
        }
      };
    },
  };
}

export function createClient<S extends SchemaDefinition>(
  opts: ExtendedClientOptions & { schema: S },
): {
  [K in keyof S]: CollectionClient<S[K]>;
} & {
  auth: AuthClient;
  webhooks: WebhooksClient;
  cron: CronClient;
  storage: StorageClient;
  search: SearchClient;
  sync: SyncClient | null;
  realtime: ReturnType<typeof createRealtimeMethods>;
};

export function createClient(opts: ExtendedClientOptions): {
  collection: (name: string) => CollectionClient;
  auth: AuthClient;
  webhooks: WebhooksClient;
  cron: CronClient;
  storage: StorageClient;
  search: SearchClient;
  sync: SyncClient | null;
  realtime: ReturnType<typeof createRealtimeMethods>;
};

export function createClient<S extends SchemaDefinition>(
  opts: ExtendedClientOptions & { schema?: S },
) {
  const baseUrl = opts.baseUrl || DEFAULT_BASE_URL;
  const apiKey = opts.apiKey || opts.publicKey || "";

  // Initialize feature clients
  const auth = new AuthClient(baseUrl, apiKey);
  const webhooks = new WebhooksClient(baseUrl, apiKey);
  const cron = new CronClient(baseUrl, apiKey);
  const storage = new StorageClient(baseUrl, apiKey);
  const search = new SearchClient(baseUrl, apiKey);
  const realtime = createRealtimeMethods(baseUrl, apiKey);

  // Initialize sync if configured
  let sync: SyncClient | null = null;
  if (opts.sync) {
    sync = new SyncClient(baseUrl, apiKey, opts.sync);
    // Auto-init in browser
    if (typeof window !== "undefined") {
      sync.init().catch(console.error);
    }
  }

  // If no schema provided, return dynamic client
  if (!opts.schema) {
    return {
      collection: (name: string) =>
        new CollectionClient(name, baseUrl, apiKey, { properties: {} }),
      auth,
      webhooks,
      cron,
      storage,
      search,
      sync,
      realtime,
    };
  }

  // Build typed collection handlers
  const handler: Record<string, CollectionClient> = {};

  for (const collection in opts.schema) {
    const schema = opts.schema[collection];
    handler[collection] = new CollectionClient(
      collection,
      baseUrl,
      apiKey,
      schema,
    );
  }

  return {
    ...handler,
    auth,
    webhooks,
    cron,
    storage,
    search,
    sync,
    realtime,
  };
}

class CollectionClient<TSchema extends JSONSchema = JSONSchema> {
  constructor(
    private collection: string,
    private baseUrl: string,
    private apiKey: string,
    private schema: TSchema,
  ) {}

  async insert(data: Record<string, any>) {
    const required = getRequiredFields(this.schema);
    const unique = getUniqueFields(this.schema);

    const payload = applyDefaultValues(this.schema, { ...data });

    for (const field of required) {
      if (!(field in payload)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.key !== undefined) {
      payload.key = data.key;
    }

    const res = await fetch(`${this.baseUrl}/${this.collection}/docs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        unique,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Insert failed");
    }

    return res.json();
  }

  async find(options?: {
    filter?: InferFilterProps<InferSchemaProps<TSchema["properties"]>>;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const url = new URL(`${this.baseUrl}/${this.collection}/docs`);

    const fieldTypes = this.schema.properties;

    if (options?.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        const fieldType = fieldTypes[key]?.type ?? "string"; // fallback to string if unknown

        if (value && typeof value === "object" && !Array.isArray(value)) {
          // Advanced filter operators
          for (const [op, opValue] of Object.entries(value)) {
            url.searchParams.append(`filter[${key}][${op}]`, String(opValue));
          }
        } else {
          // Simple equality
          url.searchParams.append(`filter[${key}]`, String(value));
        }

        // Send type hint
        url.searchParams.append(`type[${key}]`, fieldType);
      }
    }

    if (options?.sort) {
      url.searchParams.append("sort", options.sort);
    }

    if (options?.limit !== undefined) {
      url.searchParams.append("limit", String(options.limit));
    }

    if (options?.offset !== undefined) {
      url.searchParams.append("offset", String(options.offset));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to fetch documents");
    }

    return res.json();
  }

  async get<Select extends SelectFields<any>>(
    id: string,
    options?: { select?: Select },
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}/${this.collection}/docs/${id}`);

    let hasSelect = false;
    const selectedFields = new Set<string>();

    if (options?.select) {
      for (const [key, value] of Object.entries(options.select)) {
        if (value) {
          selectedFields.add(key);
          hasSelect = true;
        }
      }
    }

    if (hasSelect) {
      url.searchParams.set("select", Array.from(selectedFields).join(","));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to fetch document");
    }

    return res.json();
  }

  async update(id: string, data: Partial<InferSchemaProps<any>>) {
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch(`${this.baseUrl}/${this.collection}/docs/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Update failed");
    }

    return res.json();
  }

  async delete(id: string) {
    const res = await fetch(`${this.baseUrl}/${this.collection}/docs/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Delete failed");
    }

    return res.json();
  }

  async insertBulk(data: Record<string, any>[]) {
    const required = getRequiredFields(this.schema);
    const unique = getUniqueFields(this.schema);

    const payload = data.map((doc) => {
      const withDefaults = applyDefaultValues(this.schema, { ...doc });

      for (const field of required) {
        if (!(field in withDefaults)) {
          throw new Error(
            `Missing required field '${field}' in one of the documents.`,
          );
        }
      }

      if (doc.key !== undefined) {
        withDefaults.key = doc.key;
      }

      return {
        ...withDefaults,
        unique,
      };
    });

    const res = await fetch(`${this.baseUrl}/${this.collection}/bulk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Insert bulk failed");
    }

    return res.json();
  }

  async count(options?: {
    filter?: InferFilterProps<InferSchemaProps<TSchema["properties"]>>;
  }): Promise<number> {
    const url = new URL(`${this.baseUrl}/${this.collection}/count`);

    const fieldTypes = this.schema.properties;

    if (options?.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        const fieldType = fieldTypes[key]?.type ?? "string";

        if (value && typeof value === "object" && !Array.isArray(value)) {
          // Advanced filter operators
          for (const [op, opValue] of Object.entries(value)) {
            url.searchParams.append(`filter[${key}][${op}]`, String(opValue));
          }
        } else {
          // Simple equality
          url.searchParams.append(`filter[${key}]`, String(value));
        }

        // Send type hint
        url.searchParams.append(`type[${key}]`, fieldType);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to fetch count");
    }

    const json = await res.json();
    return json.count;
  }
}
