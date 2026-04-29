import { z } from "zod";
import type { Context } from "hono";

// ─── Schemas ────────────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(100).optional(),
});

export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const UpdateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
});

export const CreateWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z
    .array(z.string())
    .min(1, "At least one event type is required"),
  collections: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  headers: z.record(z.string()).default({}),
});

export const CreateCronSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  schedule: z.string().min(1, "Schedule is required"),
  timezone: z.string().default("UTC"),
  action: z.object({
    type: z.enum(["http", "collection", "function"]),
    url: z.string().url().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    headers: z.record(z.string()).optional(),
    body: z.record(z.unknown()).optional(),
    collection: z.string().optional(),
    operation: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
  }),
  enabled: z.boolean().default(true),
});

export const CreateDocSchema = z.object({}).passthrough().refine(
  (v) => typeof v === "object" && !Array.isArray(v) && v !== null,
  { message: "Body must be a plain JSON object" },
);

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Validate a Hono request body against a Zod schema.
 * Returns `{ data }` on success or `{ error }` (a Hono JSON response) on failure.
 */
export async function validateBody<T>(
  c: Context,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return {
      error: c.json({ error: "Request body must be valid JSON" }, 400) as any,
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message).join("; ");
    return { error: c.json({ error: messages }, 400) as any };
  }

  return { data: result.data };
}
