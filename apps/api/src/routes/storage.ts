/**
 * Storage API Routes
 * File upload, management, and CDN delivery
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { sql } from "../lib/db.js";
import { authenticateApiKey, DbContext } from "../lib/auth.js";

type Variables = {
  dbContext: DbContext;
};

export const storageRoutes = new Hono<{ Variables: Variables }>();

const CDN_BASE_URL = process.env.CDN_BASE_URL || "https://cdn.paperdb.dev";
const STORAGE_BASE_URL =
  process.env.STORAGE_BASE_URL || "https://storage.paperdb.dev";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "52428800", 10);

// Middleware to authenticate API key
storageRoutes.use("*", async (c, next) => {
  const apiKey =
    c.req.header("Authorization")?.replace("Bearer ", "") ||
    c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "API key required" }, 401);
  }

  const dbContext = await authenticateApiKey(apiKey);
  if (!dbContext) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  c.set("dbContext", dbContext);
  await next();
});

/**
 * POST /storage/upload
 * Upload a single file
 */
storageRoutes.post("/upload", async (c) => {
  const { dbId } = c.get("dbContext");

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        400,
      );
    }

    const folder = (formData.get("folder") as string) || "/";
    const isPublic = formData.get("isPublic") === "true";
    const metadataStr = formData.get("metadata") as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    const id = nanoid();
    const ext = file.name.split(".").pop() || "";
    const safeName = `${id}${ext ? `.${ext}` : ""}`;
    const path = `${dbId}/${folder.replace(/^\/|\/$/g, "")}/${safeName}`.replace(/\/+/g, "/");

    const buffer = await file.arrayBuffer();
    const checksum = createHash("sha256").update(Buffer.from(buffer)).digest("hex");

    const url = `${STORAGE_BASE_URL}/${path}`;
    const cdnUrl = `${CDN_BASE_URL}/${path}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO files (id, database_id, name, original_name, mime_type, size_bytes, path, url, cdn_url, folder, metadata, is_public, checksum, created_at, updated_at)
      VALUES (${id}, ${dbId}, ${safeName}, ${file.name}, ${file.type}, ${file.size}, ${path}, ${url}, ${cdnUrl}, ${folder}, ${JSON.stringify(metadata)}::jsonb, ${isPublic}, ${checksum}, ${now}, ${now})
    `;

    return c.json(
      {
        id, name: safeName, originalName: file.name, mimeType: file.type,
        size: file.size, url, cdnUrl, path, folder, metadata, isPublic,
        createdAt: now, updatedAt: now,
      },
      201,
    );
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

/**
 * POST /storage/upload-many
 * Upload multiple files
 */
storageRoutes.post("/upload-many", async (c) => {
  const { dbId } = c.get("dbContext");

  try {
    const formData = await c.req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return c.json({ error: "No files provided" }, 400);
    }

    const folder = (formData.get("folder") as string) || "/";
    const isPublic = formData.get("isPublic") === "true";
    const metadataStr = formData.get("metadata") as string;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    const results = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        results.push({ error: `File ${file.name} exceeds maximum size`, name: file.name });
        continue;
      }

      const id = nanoid();
      const ext = file.name.split(".").pop() || "";
      const safeName = `${id}${ext ? `.${ext}` : ""}`;
      const path = `${dbId}/${folder.replace(/^\/|\/$/g, "")}/${safeName}`.replace(/\/+/g, "/");
      const buffer = await file.arrayBuffer();
      const checksum = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
      const url = `${STORAGE_BASE_URL}/${path}`;
      const cdnUrl = `${CDN_BASE_URL}/${path}`;
      const now = new Date().toISOString();

      await sql`
        INSERT INTO files (id, database_id, name, original_name, mime_type, size_bytes, path, url, cdn_url, folder, metadata, is_public, checksum, created_at, updated_at)
        VALUES (${id}, ${dbId}, ${safeName}, ${file.name}, ${file.type}, ${file.size}, ${path}, ${url}, ${cdnUrl}, ${folder}, ${JSON.stringify(metadata)}::jsonb, ${isPublic}, ${checksum}, ${now}, ${now})
      `;

      results.push({ id, name: safeName, originalName: file.name, mimeType: file.type, size: file.size, url, cdnUrl, path, isPublic, createdAt: now });
    }

    return c.json(results, 201);
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

/**
 * POST /storage/upload-url
 * Upload from URL
 */
storageRoutes.post("/upload-url", async (c) => {
  const { dbId } = c.get("dbContext");
  const body = await c.req.json();
  const { url: sourceUrl, name, folder = "/", isPublic = false, metadata = {} } = body;

  if (!sourceUrl) {
    return c.json({ error: "URL is required" }, 400);
  }

  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return c.json({ error: "Failed to fetch file from URL" }, 400);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;

    if (size > MAX_FILE_SIZE) {
      return c.json({ error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` }, 400);
    }

    const id = nanoid();
    const originalName = name || sourceUrl.split("/").pop() || "file";
    const ext = originalName.split(".").pop() || "";
    const safeName = `${id}${ext ? `.${ext}` : ""}`;
    const path = `${dbId}/${folder.replace(/^\/|\/$/g, "")}/${safeName}`.replace(/\/+/g, "/");
    const checksum = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
    const fileUrl = `${STORAGE_BASE_URL}/${path}`;
    const cdnUrl = `${CDN_BASE_URL}/${path}`;
    const now = new Date().toISOString();

    await sql`
      INSERT INTO files (id, database_id, name, original_name, mime_type, size_bytes, path, url, cdn_url, folder, metadata, is_public, checksum, created_at, updated_at)
      VALUES (${id}, ${dbId}, ${safeName}, ${originalName}, ${contentType}, ${size}, ${path}, ${fileUrl}, ${cdnUrl}, ${folder}, ${JSON.stringify(metadata)}::jsonb, ${isPublic}, ${checksum}, ${now}, ${now})
    `;

    return c.json(
      { id, name: safeName, originalName, mimeType: contentType, size, url: fileUrl, cdnUrl, path, folder, metadata, isPublic, createdAt: now, updatedAt: now },
      201,
    );
  } catch (error) {
    console.error("Upload from URL error:", error);
    return c.json({ error: "Failed to upload from URL" }, 500);
  }
});

/**
 * GET /storage
 * List files
 */
storageRoutes.get("/", async (c) => {
  const { dbId } = c.get("dbContext");
  const folder = c.req.query("folder");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  let rows: any[];
  let countRows: any[];

  if (folder) {
    rows = await sql`
      SELECT id, name, original_name, mime_type, size_bytes, url, cdn_url, path, folder, metadata, is_public, created_at, updated_at
      FROM files WHERE database_id = ${dbId} AND folder = ${folder}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`SELECT COUNT(*)::int as count FROM files WHERE database_id = ${dbId} AND folder = ${folder}`;
  } else {
    rows = await sql`
      SELECT id, name, original_name, mime_type, size_bytes, url, cdn_url, path, folder, metadata, is_public, created_at, updated_at
      FROM files WHERE database_id = ${dbId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`SELECT COUNT(*)::int as count FROM files WHERE database_id = ${dbId}`;
  }

  const total = Number(countRows[0]?.count || 0);

  return c.json({
    files: rows.map((row: any) => ({
      id: row.id, name: row.name, originalName: row.original_name,
      mimeType: row.mime_type, size: row.size_bytes, url: row.url,
      cdnUrl: row.cdn_url, path: row.path, folder: row.folder,
      metadata: row.metadata, isPublic: row.is_public,
      createdAt: row.created_at, updatedAt: row.updated_at,
    })),
    total,
    hasMore: offset + rows.length < total,
  });
});

/**
 * GET /storage/:id
 * Get file by ID
 */
storageRoutes.get("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");

  const rows = await sql`
    SELECT id, name, original_name, mime_type, size_bytes, url, cdn_url, path, folder, metadata, is_public, created_at, updated_at
    FROM files WHERE id = ${id} AND database_id = ${dbId}
  `;

  if (rows.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }

  const row = rows[0];
  return c.json({
    id: row.id, name: row.name, originalName: row.original_name,
    mimeType: row.mime_type, size: row.size_bytes, url: row.url,
    cdnUrl: row.cdn_url, path: row.path, folder: row.folder,
    metadata: row.metadata, isPublic: row.is_public,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
});

/**
 * PATCH /storage/:id
 * Update file metadata
 */
storageRoutes.patch("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { name, isPublic, metadata } = body;

  const updates: string[] = [];
  const args: any[] = [];
  let p = 1;

  if (name !== undefined) { updates.push(`name = $${p++}`); args.push(name); }
  if (isPublic !== undefined) { updates.push(`is_public = $${p++}`); args.push(isPublic); }
  if (metadata !== undefined) { updates.push(`metadata = $${p++}`); args.push(JSON.stringify(metadata)); }

  if (updates.length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  updates.push(`updated_at = NOW()`);
  args.push(id, dbId);

  const rows = await sql.unsafe(
    `UPDATE files SET ${updates.join(", ")} WHERE id = $${p++} AND database_id = $${p}
     RETURNING id, name, original_name, mime_type, size_bytes, url, cdn_url, path, folder, metadata, is_public, created_at, updated_at`,
    args,
  );

  if (rows.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }

  const row = rows[0];
  return c.json({
    id: row.id, name: row.name, originalName: row.original_name,
    mimeType: row.mime_type, size: row.size_bytes, url: row.url,
    cdnUrl: row.cdn_url, path: row.path, folder: row.folder,
    metadata: row.metadata, isPublic: row.is_public,
    createdAt: row.created_at, updatedAt: row.updated_at,
  });
});

/**
 * DELETE /storage/:id
 * Delete a file
 */
storageRoutes.delete("/:id", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");

  const rows = await sql`
    DELETE FROM files WHERE id = ${id} AND database_id = ${dbId} RETURNING path
  `;

  if (rows.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.json({ success: true });
});

/**
 * POST /storage/delete-many
 * Delete multiple files
 */
storageRoutes.post("/delete-many", async (c) => {
  const { dbId } = c.get("dbContext");
  const body = await c.req.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "File IDs required" }, 400);
  }

  const rows = await sql`
    DELETE FROM files WHERE id = ANY(${ids}) AND database_id = ${dbId} RETURNING id
  `;
  return c.json({ deleted: rows.length });
});

/**
 * POST /storage/:id/signed-url
 * Generate a signed URL for private file access
 * TODO Phase 2: replace with real presigned URL from S3/R2/MinIO
 */
storageRoutes.post("/:id/signed-url", async (c) => {
  const { dbId } = c.get("dbContext");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { expiresIn = 3600 } = body;

  const rows = await sql`
    SELECT path FROM files WHERE id = ${id} AND database_id = ${dbId}
  `;

  if (rows.length === 0) {
    return c.json({ error: "File not found" }, 404);
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const signedUrl = `${STORAGE_BASE_URL}/${rows[0].path}?expires=${expiresAt}&signature=pending_real_integration`;

  return c.json({ url: signedUrl, expiresAt });
});

/**
 * GET /storage/folders
 * List folders
 */
storageRoutes.get("/folders", async (c) => {
  const { dbId } = c.get("dbContext");
  const parent = c.req.query("parent") || "/";

  const rows = await sql`
    SELECT DISTINCT folder FROM files WHERE database_id = ${dbId} AND folder LIKE ${`${parent}%`}
  `;

  return c.json([...new Set(rows.map((r: any) => r.folder))]);
});

/**
 * POST /storage/folders
 * Create a folder (virtual)
 */
storageRoutes.post("/folders", async (c) => {
  const body = await c.req.json();
  const { path } = body;

  if (!path) {
    return c.json({ error: "Path is required" }, 400);
  }

  return c.json({ path, createdAt: new Date().toISOString() }, 201);
});
