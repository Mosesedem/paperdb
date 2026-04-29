import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { sql } from "./db.js";

async function runMigrations() {
  console.log("Running migrations...");

  try {
    // 1. Ensure migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT        NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Get applied migrations
    const appliedRows = await sql`SELECT filename FROM _migrations`;
    const applied = new Set(appliedRows.map((r) => r.filename));

    // 3. Read migration files
    const migrationsDir = join(process.cwd(), "migrations");
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    // 4. Apply new migrations
    let appliedCount = 0;
    for (const file of sqlFiles) {
      if (!applied.has(file)) {
        console.log(`Applying ${file}...`);
        const filePath = join(migrationsDir, file);
        const sqlContent = await readFile(filePath, "utf-8");

        // Run the migration script
        await sql.unsafe(sqlContent);

        // Record it
        await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
        console.log(`✅ Applied ${file}`);
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      console.log("No new migrations to apply.");
    } else {
      console.log(`Successfully applied ${appliedCount} migration(s).`);
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
