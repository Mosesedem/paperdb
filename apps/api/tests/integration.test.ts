/**
 * PaperDB V1 Integration Tests
 *
 * Covers the 10 core onboarding operations required by the PRD:
 *   1. sign-up
 *   2. sign-in
 *   3. GET /auth/me
 *   4. insert (POST /:collection/docs)
 *   5. find   (GET  /:collection/docs)
 *   6. get    (GET  /:collection/docs/:id)
 *   7. update (PATCH /:collection/docs/:id)
 *   8. delete (DELETE /:collection/docs/:id)
 *   9. bulk insert + count
 *  10. realtime token generation
 *
 * Requirements to run:
 *   - DATABASE_URL and REDIS_URL pointing at live dev instances
 *   - JWT_SECRET set
 *   - A seeded api_key row in the database (or use the bootstrap script)
 *
 * Run: pnpm --filter @paperdb/api test
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.TEST_API_URL ?? "http://localhost:3001";
const API_KEY = process.env.TEST_API_KEY ?? "";

// ── Helpers ──────────────────────────────────────────────────────────────────

function api(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(init?.headers ?? {}),
    },
  });
}

// ── State shared across tests ─────────────────────────────────────────────────

let sessionToken = "";
let docId = "";
const collection = `test_${Date.now()}`;

// ── Health ────────────────────────────────────────────────────────────────────

describe("Health check", () => {
  it("GET / returns ok with version 1.0.0", async () => {
    const res = await fetch(`${BASE}/`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.version).toBe("1.0.0");
    expect(body.db).toBe("connected");
  });

  it("response includes X-PaperDB-Version: 1 header", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.headers.get("X-PaperDB-Version")).toBe("1");
  });
});

// ── OpenAPI ───────────────────────────────────────────────────────────────────

describe("OpenAPI spec", () => {
  it("GET /openapi.json returns valid spec", async () => {
    const res = await fetch(`${BASE}/openapi.json`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.info.version).toBe("1.0.0");
    expect(typeof body.paths).toBe("object");
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("Auth — sign-up", () => {
  it("1. POST /auth/sign-up creates a user and returns a session token", async () => {
    const email = `test_${Date.now()}@paperdb.test`;
    const res = await api("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password: "securePass123", name: "Test User" }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
    expect(body.session).toBeDefined();
    expect(typeof body.session.token).toBe("string");
    sessionToken = body.session.token;
  });

  it("sign-up rejects invalid email", async () => {
    const res = await api("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "pass1234" }),
    });
    expect(res.status).toBe(400);
  });

  it("sign-up rejects short password", async () => {
    const res = await api("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email: `x${Date.now()}@test.com`, password: "short" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Auth — sign-in", () => {
  const email = `signin_${Date.now()}@paperdb.test`;
  const password = "securePass456";

  beforeAll(async () => {
    await api("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  });

  it("2. POST /auth/sign-in returns a session token", async () => {
    const res = await api("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.session.token).toBe("string");
    sessionToken = body.session.token;
  });

  it("sign-in rejects wrong password", async () => {
    const res = await api("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Auth — GET /auth/me", () => {
  it("3. GET /auth/me returns authenticated user", async () => {
    const res = await api("/auth/me", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.user).toBeDefined();
    expect(typeof body.user.email).toBe("string");
  });

  it("GET /auth/me rejects missing token", async () => {
    const res = await fetch(`${BASE}/auth/me`, {
      headers: { "X-API-Key": API_KEY },
    });
    expect(res.status).toBe(401);
  });
});

// ── Documents ─────────────────────────────────────────────────────────────────

describe("Documents — CRUD", () => {
  it("4. POST /:collection/docs inserts a document", async () => {
    const res = await api(`/${collection}/docs`, {
      method: "POST",
      body: JSON.stringify({ title: "Hello PaperDB", count: 0 }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body._id).toBeDefined();
    expect(body.title).toBe("Hello PaperDB");
    docId = body._id;
  });

  it("POST /:collection/docs rejects array body", async () => {
    const res = await api(`/${collection}/docs`, {
      method: "POST",
      body: JSON.stringify([{ title: "bad" }]),
    });
    expect(res.status).toBe(400);
  });

  it("5. GET /:collection/docs lists documents", async () => {
    const res = await api(`/${collection}/docs`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it("6. GET /:collection/docs/:id retrieves a document by ID", async () => {
    const res = await api(`/${collection}/docs/${docId}`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body._id).toBe(docId);
    expect(body.title).toBe("Hello PaperDB");
  });

  it("GET /:collection/docs/:id returns 404 for unknown ID", async () => {
    const res = await api(`/${collection}/docs/nonexistent_id_xyz`);
    expect(res.status).toBe(404);
  });

  it("7. PATCH /:collection/docs/:id updates a document", async () => {
    const res = await api(`/${collection}/docs/${docId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title", count: { increment: 5 } }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.title).toBe("Updated Title");
    expect(body.count).toBe(5);
  });

  it("8. DELETE /:collection/docs/:id deletes a document", async () => {
    const res = await api(`/${collection}/docs/${docId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);

    // Verify it's gone
    const check = await api(`/${collection}/docs/${docId}`);
    expect(check.status).toBe(404);
  });
});

// ── Bulk + Count ──────────────────────────────────────────────────────────────

describe("Documents — bulk insert + count", () => {
  const bulkCollection = `bulk_${Date.now()}`;

  it("9. POST /:collection/bulk inserts multiple documents", async () => {
    const docs = [
      { name: "Alpha", score: 10 },
      { name: "Beta", score: 20 },
      { name: "Gamma", score: 30 },
    ];
    const res = await api(`/${bulkCollection}/bulk`, {
      method: "POST",
      body: JSON.stringify(docs),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);
  });

  it("GET /:collection/count returns correct count after bulk insert", async () => {
    const res = await api(`/${bulkCollection}/count`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.count).toBe(3);
  });
});

// ── Realtime token ────────────────────────────────────────────────────────────

describe("Realtime token generation", () => {
  it("10. POST /realtime/token returns a signed token", async () => {
    const res = await api("/realtime/token", {
      method: "POST",
      body: JSON.stringify({ collection: "messages" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.token).toBe("string");
    // Token must be a JWT (three dot-separated base64url segments)
    expect(body.token.split(".").length).toBe(3);
  });

  it("POST /realtime/token supports multiple collections", async () => {
    const res = await api("/realtime/token", {
      method: "POST",
      body: JSON.stringify({ collections: ["messages", "notifications"] }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(typeof body.token).toBe("string");
  });
});
