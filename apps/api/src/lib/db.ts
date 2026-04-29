import postgres from "postgres";

/**
 * Unified postgres.js client — the single DB access point for all routes.
 * All routes use `sql` tagged templates directly; `pg` Pool has been removed.
 */
export const sql = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});
