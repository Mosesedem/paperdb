/**
 * SDK Authentication Routes
 * Provides auth endpoints for end-users of PaperDB-powered apps
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { sign, verify } from "jsonwebtoken";
import { hash, compare } from "bcrypt";
import { getPool } from "../lib/db.js";
import { authenticateApiKey } from "../lib/auth.js";

export const authRoutes = new Hono();

const JWT_SECRET =
  process.env.JWT_SECRET || "paperdb-jwt-secret-change-in-production";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper to generate session token
function generateSessionToken(userId: string, dbId: string): string {
  return sign({ userId, dbId }, JWT_SECRET, { expiresIn: "7d" });
}

// Helper to verify session token
function verifySessionToken(
  token: string,
): { userId: string; dbId: string } | null {
  try {
    return verify(token, JWT_SECRET) as { userId: string; dbId: string };
  } catch {
    return null;
  }
}

// Middleware to get database context from API key
async function getDbContext(c: any) {
  const apiKey =
    c.req.header("X-API-Key") ||
    c.req.header("Authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return null;
  }
  return await authenticateApiKey(apiKey);
}

/**
 * POST /auth/sign-up
 * Create a new user account
 */
authRoutes.post("/sign-up", async (c) => {
  const dbContext = await getDbContext(c);
  if (!dbContext) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  const body = await c.req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const pool = getPool();

  // Check if user already exists
  const existing = await pool.query(
    "SELECT id FROM sdk_users WHERE database_id = $1 AND email = $2",
    [dbContext.dbId, email.toLowerCase()],
  );

  if (existing.rows.length > 0) {
    return c.json({ error: "User with this email already exists" }, 409);
  }

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create user
  const userId = nanoid();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO sdk_users (id, database_id, email, password_hash, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [
      userId,
      dbContext.dbId,
      email.toLowerCase(),
      passwordHash,
      name || null,
      now,
    ],
  );

  // Create session
  const sessionId = nanoid();
  const token = generateSessionToken(userId, dbContext.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await pool.query(
    `INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, userId, token, expiresAt, now],
  );

  return c.json({
    user: {
      id: userId,
      email: email.toLowerCase(),
      name: name || null,
      role: "user",
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: sessionId,
      userId,
      expiresAt,
      token,
    },
  });
});

/**
 * POST /auth/sign-in
 * Sign in with email and password
 */
authRoutes.post("/sign-in", async (c) => {
  const dbContext = await getDbContext(c);
  if (!dbContext) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const pool = getPool();

  // Find user
  const result = await pool.query(
    `SELECT id, email, password_hash, name, avatar, role, email_verified, created_at, updated_at
     FROM sdk_users WHERE database_id = $1 AND email = $2`,
    [dbContext.dbId, email.toLowerCase()],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await compare(password, user.password_hash);
  if (!isValid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Create session
  const sessionId = nanoid();
  const token = generateSessionToken(user.id, dbContext.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, user.id, token, expiresAt, now],
  );

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    session: {
      id: sessionId,
      userId: user.id,
      expiresAt,
      token,
    },
  });
});

/**
 * POST /auth/sign-out
 * Sign out and invalidate session
 */
authRoutes.post("/sign-out", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    const pool = getPool();
    await pool.query("DELETE FROM sdk_sessions WHERE token = $1", [token]);
  }

  return c.json({ success: true });
});

/**
 * GET /auth/me
 * Get current user
 */
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const pool = getPool();

  // Verify session exists and not expired
  const sessionResult = await pool.query(
    `SELECT s.id, s.expires_at FROM sdk_sessions s
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );

  if (sessionResult.rows.length === 0) {
    return c.json({ error: "Session expired" }, 401);
  }

  // Get user
  const userResult = await pool.query(
    `SELECT id, email, name, avatar, role, email_verified, created_at, updated_at
     FROM sdk_users WHERE id = $1`,
    [decoded.userId],
  );

  if (userResult.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  const user = userResult.rows[0];

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

/**
 * GET /auth/session
 * Get current session
 */
authRoutes.get("/session", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const pool = getPool();

  const result = await pool.query(
    `SELECT id, user_id, expires_at, created_at
     FROM sdk_sessions WHERE token = $1 AND expires_at > NOW()`,
    [token],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Session expired" }, 401);
  }

  const session = result.rows[0];

  return c.json({
    session: {
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      token,
    },
  });
});

/**
 * POST /auth/refresh
 * Refresh session token
 */
authRoutes.post("/refresh", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const pool = getPool();

  // Get current session
  const sessionResult = await pool.query(
    `SELECT s.id, s.user_id FROM sdk_sessions s WHERE s.token = $1`,
    [token],
  );

  if (sessionResult.rows.length === 0) {
    return c.json({ error: "Session not found" }, 401);
  }

  const oldSession = sessionResult.rows[0];

  // Get user
  const userResult = await pool.query(
    `SELECT id, email, name, avatar, role, email_verified, created_at, updated_at
     FROM sdk_users WHERE id = $1`,
    [oldSession.user_id],
  );

  if (userResult.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  const user = userResult.rows[0];

  // Create new session
  const newSessionId = nanoid();
  const newToken = generateSessionToken(user.id, decoded.dbId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const now = new Date().toISOString();

  // Delete old session and create new one
  await pool.query("DELETE FROM sdk_sessions WHERE id = $1", [oldSession.id]);
  await pool.query(
    `INSERT INTO sdk_sessions (id, user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [newSessionId, user.id, newToken, expiresAt, now],
  );

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    session: {
      id: newSessionId,
      userId: user.id,
      expiresAt,
      token: newToken,
    },
  });
});

/**
 * PATCH /auth/me
 * Update user profile
 */
authRoutes.patch("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const body = await c.req.json();
  const { name, avatar } = body;

  const pool = getPool();

  const result = await pool.query(
    `UPDATE sdk_users SET name = COALESCE($1, name), avatar = COALESCE($2, avatar), updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, name, avatar, role, email_verified, created_at, updated_at`,
    [name, avatar, decoded.userId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  const user = result.rows[0];

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

/**
 * POST /auth/change-password
 * Change user password
 */
authRoutes.post("/change-password", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const body = await c.req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return c.json({ error: "Current and new password are required" }, 400);
  }

  if (newPassword.length < 8) {
    return c.json({ error: "New password must be at least 8 characters" }, 400);
  }

  const pool = getPool();

  // Get current password hash
  const result = await pool.query(
    "SELECT password_hash FROM sdk_users WHERE id = $1",
    [decoded.userId],
  );

  if (result.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  // Verify current password
  const isValid = await compare(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }

  // Update password
  const newPasswordHash = await hash(newPassword, 12);
  await pool.query(
    "UPDATE sdk_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [newPasswordHash, decoded.userId],
  );

  return c.json({ success: true });
});
