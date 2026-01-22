/**
 * Webhooks module for PaperDB SDK
 * Manage outgoing webhooks and verify incoming webhook signatures
 */

import { createHmac } from "./crypto.js";

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  collections: string[] | "*";
  secret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WebhookEvent =
  | "document.created"
  | "document.updated"
  | "document.deleted"
  | "collection.created"
  | "collection.deleted"
  | "user.created"
  | "user.updated"
  | "user.deleted";

export interface CreateWebhookOptions {
  url: string;
  events: WebhookEvent[];
  collections?: string[] | "*";
  enabled?: boolean;
}

export interface UpdateWebhookOptions {
  url?: string;
  events?: WebhookEvent[];
  collections?: string[] | "*";
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  response?: string;
  attempts: number;
  nextRetryAt?: string;
  createdAt: string;
  completedAt?: string;
}

export class WebhooksClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}/webhooks${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Create a new webhook
   */
  async create(options: CreateWebhookOptions): Promise<Webhook> {
    return this.request("/", {
      method: "POST",
      body: JSON.stringify({
        ...options,
        collections: options.collections ?? "*",
        enabled: options.enabled ?? true,
      }),
    });
  }

  /**
   * List all webhooks
   */
  async list(): Promise<Webhook[]> {
    return this.request("/");
  }

  /**
   * Get a webhook by ID
   */
  async get(id: string): Promise<Webhook> {
    return this.request(`/${id}`);
  }

  /**
   * Update a webhook
   */
  async update(id: string, options: UpdateWebhookOptions): Promise<Webhook> {
    return this.request(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(options),
    });
  }

  /**
   * Delete a webhook
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return this.request(`/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Enable a webhook
   */
  async enable(id: string): Promise<Webhook> {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable a webhook
   */
  async disable(id: string): Promise<Webhook> {
    return this.update(id, { enabled: false });
  }

  /**
   * Rotate webhook secret
   */
  async rotateSecret(id: string): Promise<{ secret: string }> {
    return this.request(`/${id}/rotate-secret`, {
      method: "POST",
    });
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveries(
    id: string,
    options?: { limit?: number; offset?: number },
  ): Promise<WebhookDelivery[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));

    const query = params.toString();
    return this.request(`/${id}/deliveries${query ? `?${query}` : ""}`);
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(
    webhookId: string,
    deliveryId: string,
  ): Promise<WebhookDelivery> {
    return this.request(`/${webhookId}/deliveries/${deliveryId}/retry`, {
      method: "POST",
    });
  }

  /**
   * Test a webhook by sending a test payload
   */
  async test(id: string): Promise<WebhookDelivery> {
    return this.request(`/${id}/test`, {
      method: "POST",
    });
  }

  /**
   * Verify an incoming webhook signature
   * Use this to validate webhooks you receive from PaperDB
   */
  verify(
    payload: string | Record<string, unknown>,
    signature: string,
    secret: string,
  ): boolean {
    const payloadString =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const expectedSignature = createHmac(payloadString, secret);
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Parse and verify an incoming webhook request
   * Returns the parsed payload if valid, throws if invalid
   */
  parseWebhook<T = Record<string, unknown>>(
    body: string,
    signature: string,
    secret: string,
  ): T {
    if (!this.verify(body, signature, secret)) {
      throw new Error("Invalid webhook signature");
    }

    return JSON.parse(body) as T;
  }
}

/**
 * Create a webhook endpoint handler for Express/Hono/etc.
 * Automatically verifies signatures and parses payloads
 */
export function createWebhookHandler<T = Record<string, unknown>>(
  secret: string,
  handler: (payload: T, event: WebhookEvent) => void | Promise<void>,
) {
  return async (req: {
    body: string;
    headers: { get(name: string): string | null } | Record<string, string>;
  }) => {
    const signature =
      typeof req.headers.get === "function"
        ? req.headers.get("x-paperdb-signature")
        : (req.headers as Record<string, string>)["x-paperdb-signature"];

    if (!signature) {
      throw new Error("Missing webhook signature");
    }

    const expectedSignature = `sha256=${createHmac(req.body, secret)}`;

    if (signature !== expectedSignature) {
      throw new Error("Invalid webhook signature");
    }

    const payload = JSON.parse(req.body) as T & { event: WebhookEvent };
    await handler(payload, payload.event);
  };
}
