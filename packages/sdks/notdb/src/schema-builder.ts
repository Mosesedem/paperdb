/**
 * Schema builder utilities for PaperDB SDK
 * Provides a fluent API for defining collection schemas
 */

import type { SchemaDefinition, JSONSchema } from "./types.js";

// Field builder types
type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "timestamp"
  | "array"
  | "object"
  | "geo"
  | "enum";

interface FieldOptions {
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  private?: boolean;
  encrypted?: boolean;
  searchable?: boolean;
  enumValues?: string[];
  arrayItemType?: FieldBuilder;
  objectSchema?: Record<string, FieldBuilder>;
}

class FieldBuilder {
  private options: FieldOptions;

  constructor(type: FieldType) {
    this.options = { type };
  }

  required(): this {
    this.options.required = true;
    return this;
  }

  optional(): this {
    this.options.required = false;
    return this;
  }

  unique(): this {
    this.options.unique = true;
    return this;
  }

  default(value: unknown): this {
    this.options.default = value;
    return this;
  }

  /**
   * Mark field as private (excluded from public key reads)
   */
  private(): this {
    this.options.private = true;
    return this;
  }

  /**
   * Mark field as encrypted (AES-256 at rest)
   */
  encrypted(): this {
    this.options.encrypted = true;
    return this;
  }

  /**
   * Mark field as searchable for full-text search
   */
  searchable(): this {
    this.options.searchable = true;
    return this;
  }

  getOptions(): FieldOptions {
    return this.options;
  }

  toJSON(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      type: this.options.type === "timestamp" ? "string" : this.options.type,
    };

    if (this.options.required) base.required = true;
    if (this.options.unique) base.unique = true;
    if (this.options.default !== undefined) base.default = this.options.default;
    if (this.options.private) base.private = true;
    if (this.options.encrypted) base.encrypted = true;
    if (this.options.searchable) base.searchable = true;
    if (this.options.enumValues) base.enum = this.options.enumValues;

    return base;
  }
}

/**
 * Field factory functions
 */
export const field = {
  string(): FieldBuilder {
    return new FieldBuilder("string");
  },

  number(): FieldBuilder {
    return new FieldBuilder("number");
  },

  boolean(): FieldBuilder {
    return new FieldBuilder("boolean");
  },

  timestamp(): FieldBuilder {
    return new FieldBuilder("timestamp");
  },

  array(itemType?: FieldBuilder): FieldBuilder {
    const builder = new FieldBuilder("array");
    if (itemType) {
      (builder as any).options.arrayItemType = itemType;
    }
    return builder;
  },

  object(schema?: Record<string, FieldBuilder>): FieldBuilder {
    const builder = new FieldBuilder("object");
    if (schema) {
      (builder as any).options.objectSchema = schema;
    }
    return builder;
  },

  geo(): FieldBuilder {
    return new FieldBuilder("geo");
  },

  enum(values: string[]): FieldBuilder {
    const builder = new FieldBuilder("enum");
    (builder as any).options.enumValues = values;
    return builder;
  },
};

/**
 * Collection configuration
 */
interface CollectionConfig {
  properties: Record<string, FieldBuilder>;
  softDelete?: boolean;
  auditLog?: boolean;
  offlineSync?: boolean;
  searchable?: string[];
}

class CollectionBuilder {
  private config: CollectionConfig;

  constructor(properties: Record<string, FieldBuilder>) {
    this.config = { properties };
  }

  softDelete(enabled = true): this {
    this.config.softDelete = enabled;
    return this;
  }

  auditLog(enabled = true): this {
    this.config.auditLog = enabled;
    return this;
  }

  offlineSync(enabled = true): this {
    this.config.offlineSync = enabled;
    return this;
  }

  searchable(fields: string[]): this {
    this.config.searchable = fields;
    return this;
  }

  toJSON(): JSONSchema & { _config?: Record<string, unknown> } {
    const properties: Record<string, Record<string, unknown>> = {};

    for (const [key, builder] of Object.entries(this.config.properties)) {
      properties[key] = builder.toJSON();
    }

    const result: JSONSchema & { _config?: Record<string, unknown> } = {
      properties,
    };

    const config: Record<string, unknown> = {};
    if (this.config.softDelete) config.softDelete = true;
    if (this.config.auditLog) config.auditLog = true;
    if (this.config.offlineSync) config.offlineSync = true;
    if (this.config.searchable) config.searchable = this.config.searchable;

    if (Object.keys(config).length > 0) {
      result._config = config;
    }

    return result;
  }

  getConfig(): CollectionConfig {
    return this.config;
  }
}

/**
 * Create a collection definition
 */
export function collection(
  properties: Record<string, FieldBuilder>,
): CollectionBuilder {
  return new CollectionBuilder(properties);
}

/**
 * Define the complete database schema
 */
export function defineSchema<T extends Record<string, CollectionBuilder>>(
  collections: T,
): { [K in keyof T]: ReturnType<T[K]["toJSON"]> } {
  const schema: Record<string, JSONSchema> = {};

  for (const [name, builder] of Object.entries(collections)) {
    schema[name] = builder.toJSON();
  }

  return schema as { [K in keyof T]: ReturnType<T[K]["toJSON"]> };
}

/**
 * Define PaperDB configuration
 */
export interface PaperDBConfig {
  apiKey?: string;
  publicKey?: string;
  baseUrl?: string;
  auth?: {
    providers?: string[];
  };
  features?: {
    realtime?: boolean;
    webhooks?: boolean;
    cron?: boolean;
    storage?: boolean;
    search?: boolean;
    offlineSync?: boolean;
  };
}

export function defineConfig(config: PaperDBConfig): PaperDBConfig {
  return config;
}
