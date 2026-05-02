# PaperDB Project Fix Plan: NextAuth, BREVO, and Branding Consolidation

**Date:** 2026-05-02  
**Scope:** Replace better-auth with NextAuth v5, implement email/password auth with password reset, integrate BREVO for all emails, consolidate paperdb → paperdb naming across the entire project.  
**Estimated Timeline:** 3–4 weeks for full execution (can be parallelized)  
**Risk Level:** Medium (auth changes require careful testing; renaming is low-risk but broad)

---

## Executive Summary

PaperDB currently uses better-auth (Polar) for authentication, which is a third-party dependency that adds complexity and limits control over auth flows. The project also has:

- Legacy `paperdb` folder/package naming that conflicts with the PaperDB brand.
- No dedicated password reset flow on the backend.
- Email sending scattered across different mechanisms (Polar, manual logic).

This plan consolidates authentication using NextAuth v5 (industry standard), implements a proper password reset flow with BREVO emails, and unifies the brand by renaming all `paperdb` references to `paperdb`.

---

## Phase 1: Renaming (Low-Risk, Can Be Done First)

### Phase 1.1: Rename SDK Directories and Packages

**Scope:** Consolidate all `paperdb` references to `paperdb`.  
**Timeline:** 4–6 hours (mostly mechanical renaming and import updates).

#### Step 1.1.1: Rename SDK directories

**Actions:**

1. Rename `packages/sdks/paperdb/` → `packages/sdks/paperdb/`
2. Rename `packages/sdks/paperdb-react/` → `packages/sdks/paperdb-react/`

**File edits:**

- **`pnpm-workspace.yaml`:**

  ```yaml
  # OLD:
  packages:
    - "apps/*"
    - "packages/*"
    - "packages/sdks/paperdb/*"

  # NEW:
  packages:
    - "apps/*"
    - "packages/*"
    - "packages/sdks/paperdb/*"
  ```

- **`packages/sdks/paperdb/package.json`:**

  ```json
  {
    "name": "paperdb",
    "version": "2.0.0",
    "description": "PaperDB - The frontend-first database for modern web apps"
    // ... rest unchanged
  }
  ```

- **`packages/sdks/paperdb-react/package.json`:**
  ```json
  {
    "name": "@paperdb/react",
    "version": "1.0.0"
    // ... rest unchanged
  }
  ```

#### Step 1.1.2: Update all imports across the project

**Files to update:**

1. `README.md` (root) — Update all SDK import examples
2. `apps/web/package.json` — Change `"paperdb": "workspace:*"`
3. `packages/sdks/paperdb-react/package.json` — Change peerDependency from `paperdb` (already correct)
4. `apps/web/app/lib/query-provider.tsx` — Update import if present
5. All example files in `apps/web/app/docs/` — Update SDK usage examples
6. `packages/cli/src/index.ts` — Update import paths if present

**Search and replace pattern:**

```
paperdb → paperdb
@paperdb → @paperdb
"paperdb": → "paperdb":
```

#### Step 1.1.3: Update TypeScript references

**Files:**

- `tsconfig.json` (if paths are aliased) — update any `@paperdb/*` aliases
- Check for any `.eslintignore` or `.gitignore` references to `paperdb`

#### Step 1.1.4: Update all internal SDK references

**Files:**

- `packages/sdks/paperdb/src/client.ts` — internal imports
- `packages/sdks/paperdb/src/index.ts` — export statements
- `packages/sdks/paperdb-react/src/*.ts` — imports from parent SDK

**Execution:**

```bash
# Search for all paperdb references
grep -r "paperdb" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" .

# Then carefully rename each occurrence:
find . -type f -name "*paperdb*" -exec mv {} \`echo {} | sed 's/paperdb/paperdb/g'\` \;
```

#### Step 1.1.5: Verify no broken imports

Run:

```bash
pnpm install
pnpm check-types
pnpm build
```

**Expected time:** 4–6 hours (mostly grep/rename, then testing).

---

## Phase 2: Email Infrastructure (BREVO Integration)

### Phase 2.1: Set Up BREVO Email Service

**Scope:** Replace all email sending with BREVO API.  
**Timeline:** 2–3 hours (implementation) + 1 hour testing.

#### Step 2.1.1: Install BREVO SDK

**File:** `apps/api/package.json`

Add:

```json
{
  "dependencies": {
    "@brevo/brevo": "^17.0.0",
    "nodemailer": "^6.9.7" // optional but useful for backward compat
  }
}
```

Run:

```bash
pnpm --filter @paperdb/api add @brevo/brevo nodemailer
```

#### Step 2.1.2: Create BREVO email service module

**File:** `apps/api/src/lib/email.ts`

```typescript
import { Configuration, TransactionalEmailsApi } from "@brevo/brevo";

const apiInstance = new TransactionalEmailsApi();
apiInstance.setApiKey(
  Configuration.ApiKeyAuth.apiKey,
  process.env.BREVO_API_KEY || "",
);

export interface EmailPayload {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  from?: { email: string; name?: string };
  replyTo?: { email: string; name?: string };
  tags?: string[];
  metadata?: Record<string, string>;
}

export async function sendEmail(payload: EmailPayload): Promise<string> {
  try {
    const result = await apiInstance.sendTransacEmail({
      to: payload.to,
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      sender: payload.from || {
        email: process.env.BREVO_SENDER_EMAIL || "noreply@paperdb.dev",
        name: process.env.BREVO_SENDER_NAME || "PaperDB",
      },
      replyTo: payload.replyTo,
      tags: payload.tags,
      headers: {
        "X-Mailer": "PaperDB/1.0",
      },
    });

    console.log(
      `[Email] Sent to ${payload.to[0].email}, messageId: ${result.messageId}`,
    );
    return result.messageId;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to send email",
    );
  }
}

// Helper functions for common email templates
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string,
): Promise<string> {
  return sendEmail({
    to: [{ email }],
    subject: "Reset Your PaperDB Password",
    htmlContent: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your PaperDB password.</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}?token=${resetToken}" 
         style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>If you didn't request this, ignore this email.</p>
    `,
    tags: ["password-reset"],
  });
}

export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<string> {
  return sendEmail({
    to: [{ email, name }],
    subject: "Welcome to PaperDB!",
    htmlContent: `
      <h2>Welcome to PaperDB, ${name || "there"}!</h2>
      <p>Your account is ready to use. Start building amazing apps with PaperDB.</p>
      <a href="${process.env.DASHBOARD_URL || "https://app.paperdb.dev"}" 
         style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Go to Dashboard
      </a>
    `,
    tags: ["welcome"],
  });
}

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
): Promise<string> {
  return sendEmail({
    to: [{ email }],
    subject: "Verify Your Email Address",
    htmlContent: `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" 
         style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
    `,
    tags: ["verification"],
  });
}
```

#### Step 2.1.3: Add environment variables

**Files:** `apps/api/.env.example`

Add:

```env
# BREVO Email Service
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@yourapp.com
BREVO_SENDER_NAME=PaperDB
DASHBOARD_URL=https://app.paperdb.dev
```

#### Step 2.1.4: Update docker-compose.yml

Add BREVO env to API service:

```yaml
api:
  environment:
    # ... existing ...
    BREVO_API_KEY: ${BREVO_API_KEY:-}
    BREVO_SENDER_EMAIL: ${BREVO_SENDER_EMAIL:-noreply@paperdb.dev}
    BREVO_SENDER_NAME: ${BREVO_SENDER_NAME:-PaperDB}
```

---

## Phase 3: NextAuth v5 Integration (Authentication Overhaul)

### Phase 3.1: Remove better-auth and install NextAuth v5

**Scope:** Replace Polar's better-auth with NextAuth v5.  
**Timeline:** 3–4 hours for setup.

#### Step 3.1.1: Remove better-auth dependencies

**File:** `apps/web/package.json`

Remove:

```json
{
  "dependencies": {
    "@polar-sh/better-auth": "^1.0.1",
    "@polar-sh/sdk": "^0.34.2",
    "better-auth": "^1.2.9",
    "better-sqlite3": "^11.10.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13"
  }
}
```

Remove files:

- `apps/web/better-auth_migrations/` (entire folder)
- `apps/web/app/lib/auth-client.ts` (if present)
- `apps/web/app/lib/server/auth.ts` (will be rewritten)
- `apps/web/app/lib/server/turso.ts` (will be rewritten)

#### Step 3.1.2: Install NextAuth v5

**File:** `apps/web/package.json`

Add:

```json
{
  "dependencies": {
    "next-auth": "^5.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

Run:

```bash
pnpm --filter @paperdb/web remove @polar-sh/better-auth @polar-sh/sdk better-auth better-sqlite3
pnpm --filter @paperdb/web add next-auth bcryptjs
pnpm install
```

#### Step 3.1.3: Create NextAuth configuration

**File:** `apps/web/auth.ts`

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { z } from "zod";
import bcrypt from "bcryptjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validated = loginSchema.safeParse(credentials);

        if (!validated.success) {
          throw new Error("Invalid credentials");
        }

        const { email, password } = validated.data;

        // Call PaperDB API to verify credentials
        try {
          const response = await fetch(`${API_URL}/auth/sign-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error("Invalid email or password");
          }

          const { user, session } = await response.json();

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            sessionToken: session.token,
          };
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "Authentication failed",
          );
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      async profile(profile) {
        // Call PaperDB API to create/get user via OAuth
        const response = await fetch(`${API_URL}/auth/oauth/google/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            name: profile.name,
            avatar: profile.picture,
          }),
        });

        if (!response.ok) throw new Error("OAuth profile creation failed");

        const { user, session } = await response.json();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: profile.picture,
          sessionToken: session.token,
        };
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      async profile(profile) {
        const response = await fetch(`${API_URL}/auth/oauth/github/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            name: profile.name,
            avatar: profile.avatar_url,
          }),
        });

        if (!response.ok) throw new Error("OAuth profile creation failed");

        const { user, session } = await response.json();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: profile.avatar_url,
          sessionToken: session.token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sessionToken = user.sessionToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.sessionToken = token.sessionToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
```

#### Step 3.1.4: Create NextAuth route handler

**File:** `apps/web/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

#### Step 3.1.5: Create middleware for session checks

**File:** `apps/web/middleware.ts`

```typescript
import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function middleware(request: Request) {
  const session = await auth();

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard") && !session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/protected/:path*"],
};
```

---

### Phase 3.2: Implement Password Reset Flow (Backend)

**Scope:** Add password reset routes, tokens, and BREVO email sending.  
**Timeline:** 3–4 hours (backend routes + database schema).

#### Step 3.2.1: Add password reset token table to database

**File:** `apps/api/migrations/003_password_reset_tokens.sql`

```sql
-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

Run migration:

```bash
pnpm --filter @paperdb/api migrate
```

#### Step 3.2.2: Create password reset routes

**File:** `apps/api/src/routes/auth.ts`

Add these routes:

```typescript
/**
 * POST /auth/forgot-password
 * Request a password reset link (sends email via BREVO)
 */
authRoutes.post("/forgot-password", async (c) => {
  const body = await c.req.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return c.json({ error: "Email is required" }, 400);
  }

  try {
    // Find user by email
    const users = await sql`
      SELECT id, email FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      // Don't reveal if email exists (security)
      return c.json({ message: "If email exists, reset link sent" }, 200);
    }

    const user = users[0];
    const token = nanoid(32);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store token hash
    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt})
    `;

    // Send reset email via BREVO
    const resetUrl = `${process.env.DASHBOARD_URL || "http://localhost:3000"}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendPasswordResetEmail(email, token, resetUrl);

    return c.json({
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return c.json({ error: "Failed to process password reset" }, 500);
  }
});

/**
 * POST /auth/reset-password
 * Reset password using valid token
 */
authRoutes.post("/reset-password", async (c) => {
  const body = await c.req.json();
  const { email, token, newPassword } = body;

  if (!email || !token || !newPassword) {
    return c.json(
      { error: "Email, token, and new password are required" },
      400,
    );
  }

  if (newPassword.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // Find and validate token
    const tokens = await sql`
      SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
    `;

    if (tokens.length === 0) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    const tokenRecord = tokens[0];

    // Verify email matches
    const users = await sql`
      SELECT id FROM users WHERE id = ${tokenRecord.user_id} AND email = ${email}
    `;

    if (users.length === 0) {
      return c.json({ error: "Email does not match" }, 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await sql`
      UPDATE users SET password_hash = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${tokenRecord.user_id}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens SET used_at = NOW()
      WHERE id = ${tokens[0].id}
    `;

    return c.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

/**
 * POST /auth/change-password
 * Change password for authenticated user
 */
authRoutes.post("/change-password", async (c) => {
  const authHeader = c.req.header("Authorization");
  const sessionToken = authHeader?.replace("Bearer ", "");

  if (!sessionToken) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!);
    const userId = (decoded as any).userId;

    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return c.json({ error: "Current and new password are required" }, 400);
    }

    if (newPassword.length < 8) {
      return c.json(
        { error: "New password must be at least 8 characters" },
        400,
      );
    }

    // Get user
    const users = await sql`
      SELECT id, password_hash FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    const user = users[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return c.json({ error: "Current password is incorrect" }, 401);
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await sql`
      UPDATE users SET password_hash = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${userId}
    `;

    return c.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return c.json({ error: "Failed to change password" }, 500);
  }
});
```

Import the email function at the top:

```typescript
import { sendPasswordResetEmail } from "../lib/email.js";
```

#### Step 3.2.3: Add password reset routes to OpenAPI spec

**File:** `apps/api/src/routes/openapi.ts`

Add paths:

```typescript
paths: {
  // ... existing paths ...
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Reset link sent (if email exists)",
        },
      },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password with token",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
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
        "200": { description: "Password reset successfully" },
        "400": { description: "Invalid or expired token" },
      },
    },
  },
  "/auth/change-password": {
    post: {
      tags: ["Auth"],
      summary: "Change password for authenticated user",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                currentPassword: { type: "string" },
                newPassword: { type: "string", minLength: 8 },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Password changed successfully" },
        "401": { description: "Unauthorized or wrong current password" },
      },
    },
  },
},
```

---

### Phase 3.3: Update Web App Authentication Pages

**Scope:** Create login, signup, password reset pages using NextAuth.  
**Timeline:** 3–4 hours (UI + logic).

#### Step 3.3.1: Create login page

**File:** `apps/web/app/login/page.tsx`

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: true,
        redirectTo: "/dashboard",
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-center text-3xl font-bold">Sign in to PaperDB</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="space-y-2 text-sm text-center">
          <div>
            <Link href="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div>
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Step 3.3.2: Create signup page

**File:** `apps/web/app/signup/page.tsx`

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-up`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Signup failed");
        return;
      }

      // Sign in after signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: true,
        redirectTo: "/dashboard",
      });

      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-center text-3xl font-bold">Create PaperDB Account</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-gray-600">At least 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### Step 3.3.3: Create forgot password page

**File:** `apps/web/app/forgot-password/page.tsx`

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to send reset link");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-3xl font-bold">Check Your Email</h1>
          <p className="text-gray-600">
            We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-center text-3xl font-bold">Reset Password</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

#### Step 3.3.4: Create reset password page

**File:** `apps/web/app/auth/reset-password/page.tsx`

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-red-600">Invalid Reset Link</h1>
          <p className="text-gray-600 mt-4">This reset link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: decodeURIComponent(email),
            token,
            newPassword: password,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-green-600">Password Reset!</h1>
          <p className="text-gray-600 mt-4">Your password has been reset successfully.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-center text-3xl font-bold">Set New Password</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 border rounded-lg"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Phase 3.4: Update SDK Auth Client

**Scope:** Update paperdb/paperdb SDK to use NextAuth tokens instead of better-auth.  
**Timeline:** 1–2 hours.

#### Step 3.4.1: Update auth client

**File:** `packages/sdks/paperdb/src/auth.ts`

```typescript
/**
 * Auth module for PaperDB SDK
 * Uses NextAuth session tokens from the web app
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: string;
}

export class AuthClient {
  private baseUrl: string;
  private sessionToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // Get session token from NextAuth (browser environment only)
    if (typeof window !== "undefined") {
      this.loadSessionFromNextAuth();
    }
  }

  private async loadSessionFromNextAuth() {
    try {
      const response = await fetch("/api/auth/session");
      const session = await response.json();

      if (session?.user?.sessionToken) {
        this.sessionToken = session.user.sessionToken;
      }
    } catch (error) {
      console.debug("[AuthClient] Could not load NextAuth session");
    }
  }

  setSessionToken(token: string) {
    this.sessionToken = token;
  }

  getSessionToken(): string | undefined {
    return this.sessionToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.sessionToken) {
      headers.Authorization = `Bearer ${this.sessionToken}`;
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || error.message || "Request failed");
    }

    return res.json();
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, name?: string): Promise<User> {
    return this.request("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  /**
   * Sign in with email and password
   * Note: NextAuth handles the actual session, this is for direct API calls
   */
  async signIn(email: string, password: string): Promise<Session> {
    return this.request("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Get current authenticated user
   */
  async getUser(): Promise<User> {
    return this.request("/auth/me");
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    this.sessionToken = undefined;
  }
}
```

---

## Phase 4: Testing and Validation

### Phase 4.1: Unit and Integration Tests

**Timeline:** 4–6 hours.

#### Step 4.1.1: Add auth route tests

**File:** `apps/api/tests/auth.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3001";
const testEmail = `test_${Date.now()}@paperdb.test`;
const testPassword = "securePassword123";

describe("Auth Routes", () => {
  let sessionToken = "";
  let userId = "";

  it("POST /auth/sign-up creates a new user", async () => {
    const res = await fetch(`${BASE}/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: "Test User",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.token).toBeDefined();
    sessionToken = body.session.token;
    userId = body.user.id;
  });

  it("POST /auth/sign-in returns session token", async () => {
    const res = await fetch(`${BASE}/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.token).toBeDefined();
  });

  it("POST /auth/forgot-password sends reset email", async () => {
    const res = await fetch(`${BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    expect(res.status).toBe(200);
  });

  it("GET /auth/me returns authenticated user", async () => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe(testEmail);
  });
});
```

Run tests:

```bash
pnpm --filter @paperdb/api test
```

---

## Execution Timeline and Resource Allocation

| Phase     | Component              | Duration      | Priority | Dependencies   |
| --------- | ---------------------- | ------------- | -------- | -------------- |
| Phase 1   | SDK Renaming           | 4–6 hrs       | High     | None           |
| Phase 2.1 | BREVO Setup            | 2–3 hrs       | High     | Phase 1        |
| Phase 3.1 | NextAuth Install       | 3–4 hrs       | High     | Phase 1        |
| Phase 3.2 | Password Reset Backend | 3–4 hrs       | High     | Phase 2.1, 3.1 |
| Phase 3.3 | Auth UI Pages          | 3–4 hrs       | High     | Phase 3.1, 3.2 |
| Phase 3.4 | SDK Updates            | 1–2 hrs       | Medium   | Phase 3.1      |
| Phase 4   | Testing & QA           | 4–6 hrs       | High     | All phases     |
| **Total** |                        | **20–29 hrs** |          |                |

**Recommended Parallelization:**

- **Week 1 (Days 1–2):** Phase 1 (SDK renaming) — can be done independently.
- **Week 1–2 (Days 3–5):** Phase 2.1 (BREVO) + Phase 3.1 (NextAuth) in parallel.
- **Week 2 (Days 6–8):** Phase 3.2 (password reset) + Phase 3.3 (UI pages) in parallel.
- **Week 3 (Days 9–10):** Phase 3.4 (SDK updates) + Phase 4 (testing).

**Team Recommendation:**

- **2 developers:** One on renaming + BREVO, one on NextAuth + UI.
- **1 QA/tester:** Full test coverage during week 3.

---

## Critical Checkpoints

1. **After Phase 1:** Verify all SDK imports resolve and type-checking passes.
2. **After Phase 2.1:** Test BREVO email delivery in staging.
3. **After Phase 3.1:** Verify NextAuth configuration and session management.
4. **After Phase 3.2:** Test password reset flow end-to-end.
5. **After Phase 3.3:** Smoke test all auth pages (login, signup, reset).
6. **After Phase 4:** Run full integration test suite and load test auth endpoints.

---

## Rollback Plan

If issues arise:

1. **SDK renaming (Phase 1):** Can be rolled back via git revert (non-functional change).
2. **BREVO (Phase 2.1):** Revert to previous email mechanism by commenting out BREVO calls.
3. **NextAuth (Phase 3.1–3.4):** Maintain better-auth code in a feature branch until NextAuth is validated in staging.

---

## Success Criteria

- [ ] All `paperdb` references renamed to `paperdb` across the codebase.
- [ ] BREVO API integration working; test emails sending successfully.
- [ ] NextAuth v5 installed and configured with email/password credentials.
- [ ] Password reset flow (forgot + reset) working end-to-end.
- [ ] All auth pages (login, signup, forgot, reset) rendering and functional.
- [ ] SDK auth client updated to use NextAuth session tokens.
- [ ] All integration tests passing.
- [ ] Zero broken links in docs; all references to auth flows updated.

---

## Post-Implementation Tasks

After all phases complete:

1. **Documentation update:** Rewrite auth docs to reflect NextAuth implementation.
2. **Migration guide:** Create guide for existing users upgrading from better-auth.
3. **Deprecation notice:** If any better-auth references remain in SDKs/docs, mark as deprecated.
4. **Monitoring:** Set up alerts for password reset email failures, failed login attempts.
5. **Performance tuning:** Monitor BREVO API rate limits and batch email sending if needed.

---

## References

- **NextAuth v5 Docs:** https://next-auth.js.org/v5
- **BREVO API:** https://developers.brevo.com/reference/send-transac-email
- **PaperDB Critic:** See `critic.md` for full project assessment.
