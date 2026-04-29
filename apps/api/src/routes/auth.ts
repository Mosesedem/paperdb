/**
 * Auth Routes — SDK Authentication
 *
 * Provides end-user sign-up, sign-in, sign-out, session management,
 * password management, and social OAuth login for PaperDB-powered apps.
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { sign, verify } from "jsonwebtoken";
import { hash, compare } from "bcrypt";
import { sql } from "../lib/db.js";
import { authenticateApiKey } from "../lib/auth.js";
import {
  SignUpSchema,
  SignInSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  validateBody,
} from "../lib/validate.js";

export const authRoutes = new Hono();

const JWT_SECRET = process.env.JWT_SECRET as string; // Validated non-null at startup
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSessionToken(userId: string, dbId: string): string {
  return sign({ userId, dbId }, JWT_SECRET, { expiresIn: "7d" });
}

function verifySessionToken(
  token: string,
): { userId: string; dbId: string } | null {
  try {
    return verify(token, JWT_SECRET) as { userId: string; dbId: string };
  } catch {
    return null;
  }
}

async function getDbContext(c: any) {
  const apiKey =
    c.req.header("X-API-Key") ||
    c.req.header("Authorization")?.replace("Bearer ", "");
  if (!apiKey) return null;
  return authenticateApiKey(apiKey);
}

// ─── Sign-up ─────────────────────────────────────────────────────────────────

authRoutes.post("/sign-up", async (c) => {
  const dbContext = await getDbContext(c);
  if (!dbContext) return c.json({ error: "Invalid API key" }, 401);

  const { data, error } = await validateBody(c, SignUpSchema);
  if (error) return error;

  const { email, password, name } = data!;

  const existing = await sql`
    SELECT id FROM sdk_users
    WHERE database_id = ${dbContext.dbId} AND email = ${email.toLowerCase()}
  `;
  if (existing.length > 0) {
    return c.json({ error: "User with this email already exists" }, 409);
  }

  const passwordHash = await hash(password, 12);
  const userId = nanoid();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO sdk_users (id, database_id, email, password_hash, name, created_at, updated_at)
    VALUES (${userId}, ${dbContext.dbId}, ${email.toLowerCase()}, ${passwordHash}, ${name ?? null}, ${now}, ${now})
  `;

  const sessionId = nanoid();
  const token = generateSessionToken(userId, dbContext.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await sql`
    INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
    VALUES (${sessionId}, ${userId}, ${token}, ${expiresAt}, ${now})
  `;

  return c.json(
    {
      user: { id: userId, email: email.toLowerCase(), name: name ?? null, role: "user", createdAt: now, updatedAt: now },
      session: { id: sessionId, userId, expiresAt, token },
    },
    201,
  );
});

// ─── Sign-in ─────────────────────────────────────────────────────────────────

authRoutes.post("/sign-in", async (c) => {
  const dbContext = await getDbContext(c);
  if (!dbContext) return c.json({ error: "Invalid API key" }, 401);

  const { data, error } = await validateBody(c, SignInSchema);
  if (error) return error;

  const { email, password } = data!;

  const userRows = await sql`
    SELECT id, email, password_hash, name, avatar, role, email_verified, created_at, updated_at
    FROM sdk_users WHERE database_id = ${dbContext.dbId} AND email = ${email.toLowerCase()}
  `;

  if (userRows.length === 0) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const user = userRows[0];
  const isValid = await compare(password, user.password_hash);
  if (!isValid) return c.json({ error: "Invalid email or password" }, 401);

  const sessionId = nanoid();
  const token = generateSessionToken(user.id, dbContext.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
    VALUES (${sessionId}, ${user.id}, ${token}, ${expiresAt}, ${now})
  `;

  return c.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatar: user.avatar,
      role: user.role, emailVerified: user.email_verified,
      createdAt: user.created_at, updatedAt: user.updated_at,
    },
    session: { id: sessionId, userId: user.id, expiresAt, token },
  });
});

// ─── Sign-out ─────────────────────────────────────────────────────────────────

authRoutes.post("/sign-out", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    await sql`DELETE FROM sdk_sessions WHERE token = ${token}`;
  }
  return c.json({ success: true });
});

// ─── Get current user ─────────────────────────────────────────────────────────

authRoutes.get("/me", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const decoded = verifySessionToken(token);
  if (!decoded) return c.json({ error: "Invalid session" }, 401);

  const sessionRows = await sql`
    SELECT id FROM sdk_sessions WHERE token = ${token} AND expires_at > NOW()
  `;
  if (sessionRows.length === 0) return c.json({ error: "Session expired" }, 401);

  const userRows = await sql`
    SELECT id, email, name, avatar, role, email_verified, created_at, updated_at
    FROM sdk_users WHERE id = ${decoded.userId}
  `;
  if (userRows.length === 0) return c.json({ error: "User not found" }, 404);

  const user = userRows[0];
  return c.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatar: user.avatar,
      role: user.role, emailVerified: user.email_verified,
      createdAt: user.created_at, updatedAt: user.updated_at,
    },
  });
});

// ─── Get session ─────────────────────────────────────────────────────────────

authRoutes.get("/session", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const decoded = verifySessionToken(token);
  if (!decoded) return c.json({ error: "Invalid session" }, 401);

  const rows = await sql`
    SELECT id, user_id, expires_at, created_at
    FROM sdk_sessions WHERE token = ${token} AND expires_at > NOW()
  `;
  if (rows.length === 0) return c.json({ error: "Session expired" }, 401);

  const s = rows[0];
  return c.json({ session: { id: s.id, userId: s.user_id, expiresAt: s.expires_at, token } });
});

// ─── Refresh session ──────────────────────────────────────────────────────────

authRoutes.post("/refresh", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const decoded = verifySessionToken(token);
  if (!decoded) return c.json({ error: "Invalid session" }, 401);

  const sessionRows = await sql`SELECT id, user_id FROM sdk_sessions WHERE token = ${token}`;
  if (sessionRows.length === 0) return c.json({ error: "Session not found" }, 401);

  const oldSession = sessionRows[0];
  const userRows = await sql`
    SELECT id, email, name, avatar, role, email_verified, created_at, updated_at
    FROM sdk_users WHERE id = ${oldSession.user_id}
  `;
  if (userRows.length === 0) return c.json({ error: "User not found" }, 404);

  const user = userRows[0];
  const newSessionId = nanoid();
  const newToken = generateSessionToken(user.id, decoded.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = new Date().toISOString();

  await sql`DELETE FROM sdk_sessions WHERE id = ${oldSession.id}`;
  await sql`
    INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
    VALUES (${newSessionId}, ${user.id}, ${newToken}, ${expiresAt}, ${now})
  `;

  return c.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatar: user.avatar,
      role: user.role, emailVerified: user.email_verified,
      createdAt: user.created_at, updatedAt: user.updated_at,
    },
    session: { id: newSessionId, userId: user.id, expiresAt, token: newToken },
  });
});

// ─── Update profile ───────────────────────────────────────────────────────────

authRoutes.patch("/me", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const decoded = verifySessionToken(token);
  if (!decoded) return c.json({ error: "Invalid session" }, 401);

  const { data, error } = await validateBody(c, UpdateProfileSchema);
  if (error) return error;

  const { name, avatar } = data!;

  const userRows = await sql`
    UPDATE sdk_users
    SET name = COALESCE(${name ?? null}, name),
        avatar = COALESCE(${avatar ?? null}, avatar),
        updated_at = NOW()
    WHERE id = ${decoded.userId}
    RETURNING id, email, name, avatar, role, email_verified, created_at, updated_at
  `;
  if (userRows.length === 0) return c.json({ error: "User not found" }, 404);

  const user = userRows[0];
  return c.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatar: user.avatar,
      role: user.role, emailVerified: user.email_verified,
      createdAt: user.created_at, updatedAt: user.updated_at,
    },
  });
});

// ─── Change password ──────────────────────────────────────────────────────────

authRoutes.post("/change-password", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const decoded = verifySessionToken(token);
  if (!decoded) return c.json({ error: "Invalid session" }, 401);

  const { data, error } = await validateBody(c, ChangePasswordSchema);
  if (error) return error;

  const { currentPassword, newPassword } = data!;

  const userRows = await sql`SELECT password_hash FROM sdk_users WHERE id = ${decoded.userId}`;
  if (userRows.length === 0) return c.json({ error: "User not found" }, 404);

  const isValid = await compare(currentPassword, userRows[0].password_hash);
  if (!isValid) return c.json({ error: "Current password is incorrect" }, 401);

  const newHash = await hash(newPassword, 12);
  await sql`UPDATE sdk_users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${decoded.userId}`;

  return c.json({ success: true });
});

// ─── OAuth — Social Login ─────────────────────────────────────────────────────
//
// Flow: SDK client calls GET /auth/oauth/:provider  →  API redirects to provider
//       Provider redirects to GET /auth/oauth/:provider/callback  →  API creates
//       session and redirects back to SDK callback URL with token in query string.

const OAUTH_PROVIDERS: Record<
  string,
  {
    authUrl: string;
    tokenUrl: string;
    userUrl: string;
    clientId: () => string | undefined;
    clientSecret: () => string | undefined;
    scope: string;
  }
> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    scope: "read:user user:email",
  },
};

/**
 * GET /auth/oauth/:provider
 * Redirect the end-user to the OAuth provider's authorization page.
 * Query params: `apiKey` (required), `redirectTo` (optional — where to send the
 * user after the callback completes).
 */
authRoutes.get("/oauth/:provider", async (c) => {
  const provider = c.req.param("provider").toLowerCase();
  const cfg = OAUTH_PROVIDERS[provider];
  if (!cfg) return c.json({ error: `Unsupported provider: ${provider}` }, 400);

  if (!cfg.clientId() || !cfg.clientSecret()) {
    return c.json({ error: `${provider} OAuth is not configured on this server` }, 501);
  }

  const apiKey = c.req.query("apiKey");
  const redirectTo = c.req.query("redirectTo") ?? "";
  if (!apiKey) return c.json({ error: "apiKey query parameter is required" }, 400);

  const dbContext = await authenticateApiKey(apiKey);
  if (!dbContext) return c.json({ error: "Invalid API key" }, 401);

  const callbackBase = process.env.OAUTH_CALLBACK_BASE_URL ?? "";
  const state = Buffer.from(
    JSON.stringify({ apiKey, redirectTo, dbId: dbContext.dbId }),
  ).toString("base64url");

  const redirectUri = `${callbackBase}/auth/oauth/${provider}/callback`;
  const params = new URLSearchParams({
    client_id: cfg.clientId()!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state,
  });

  return c.redirect(`${cfg.authUrl}?${params.toString()}`);
});

/**
 * GET /auth/oauth/:provider/callback
 * Exchange the authorization code for a token, upsert the SDK user,
 * create a session, and redirect back to the caller's redirectTo URL.
 */
authRoutes.get("/oauth/:provider/callback", async (c) => {
  const provider = c.req.param("provider").toLowerCase();
  const cfg = OAUTH_PROVIDERS[provider];
  if (!cfg) return c.json({ error: `Unsupported provider: ${provider}` }, 400);

  const code = c.req.query("code");
  const rawState = c.req.query("state");
  const oauthError = c.req.query("error");

  if (oauthError) return c.json({ error: `OAuth error: ${oauthError}` }, 400);
  if (!code || !rawState) return c.json({ error: "Missing code or state" }, 400);

  let stateData: { apiKey: string; redirectTo: string; dbId: string };
  try {
    stateData = JSON.parse(Buffer.from(rawState, "base64url").toString());
  } catch {
    return c.json({ error: "Invalid state parameter" }, 400);
  }

  const { apiKey, redirectTo, dbId } = stateData;
  const dbContext = await authenticateApiKey(apiKey);
  if (!dbContext || dbContext.dbId !== dbId) {
    return c.json({ error: "Invalid API key in state" }, 401);
  }

  // Exchange code for access token
  const callbackBase = process.env.OAUTH_CALLBACK_BASE_URL ?? "";
  const redirectUri = `${callbackBase}/auth/oauth/${provider}/callback`;

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId()!,
      client_secret: cfg.clientSecret()!,
    }),
  });

  if (!tokenRes.ok) {
    return c.json({ error: "Failed to exchange code for token" }, 502);
  }

  const tokenData = (await tokenRes.json()) as any;
  const accessToken = tokenData.access_token;

  // Fetch user info from provider
  const userRes = await fetch(cfg.userUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!userRes.ok) return c.json({ error: "Failed to fetch user profile" }, 502);

  const profile = (await userRes.json()) as any;
  const email: string | undefined =
    profile.email ?? profile.emails?.[0]?.value;
  const name: string | undefined = profile.name ?? profile.login;
  const avatar: string | undefined =
    profile.picture ?? profile.avatar_url;

  if (!email) {
    return c.json({ error: "Could not retrieve email from OAuth provider" }, 400);
  }

  // Upsert SDK user
  const now = new Date().toISOString();
  const existingRows = await sql`
    SELECT id FROM sdk_users
    WHERE database_id = ${dbId} AND email = ${email.toLowerCase()}
  `;

  let userId: string;
  if (existingRows.length > 0) {
    userId = existingRows[0].id;
    await sql`
      UPDATE sdk_users SET name = ${name ?? null}, avatar = ${avatar ?? null}, updated_at = ${now}
      WHERE id = ${userId}
    `;
  } else {
    userId = nanoid();
    await sql`
      INSERT INTO sdk_users (id, database_id, email, name, avatar, email_verified, created_at, updated_at)
      VALUES (${userId}, ${dbId}, ${email.toLowerCase()}, ${name ?? null}, ${avatar ?? null}, TRUE, ${now}, ${now})
    `;
  }

  // Create session
  const sessionId = nanoid();
  const token = generateSessionToken(userId, dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await sql`
    INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
    VALUES (${sessionId}, ${userId}, ${token}, ${expiresAt}, ${now})
  `;

  // Redirect back to client
  if (redirectTo) {
    const dest = new URL(redirectTo);
    dest.searchParams.set("token", token);
    return c.redirect(dest.toString());
  }

  return c.json({ token, expiresAt });
});
