# PaperDB Migration Progress

**Started:** 2026-05-02T00:00:00Z

This file tracks realtime progress on the NextAuth/BREVO/branding migration described in `critic_fix.md`.

## Current Status

- Active task: test verification.
- Overall execution: Phases 1-10 are implemented in code/docs; final validation remains partially blocked by existing lint/test environment issues.

## TODOs

- [completed] 1. Create progress.md and init log
- [completed] 2. Rename SDKs notdb -> paperdb
- [completed] 3. Update workspace and package refs
- [completed] 4. Add BREVO email service module
- [completed] 5. Install and configure NextAuth v5
- [completed] 6. Implement password reset backend
- [completed] 7. Add web auth pages (login/signup/forgot/reset)
- [completed] 8. Update SDK auth client for NextAuth token support
- [in-progress] 9. Run tests and type-checking
- [completed] 10. Docs, migration guide, PR notes

---

## Activity Log

- 2026-05-02T00:00:00Z - Initialized progress tracking file.
- 2026-05-02T00:18:00Z - Renamed SDK folders: `packages/sdks/notdb` -> `packages/sdks/paperdb`, `packages/sdks/notdb-react` -> `packages/sdks/paperdb-react`.
- 2026-05-02T00:22:00Z - Updated naming references and workspace/package links across affected files.
- 2026-05-02T00:35:00Z - Added BREVO service (`apps/api/src/lib/email.ts`) and env wiring (`apps/api/.env.example`, `docker-compose.yml`).
- 2026-05-02T00:40:00Z - Added password reset migration `apps/api/migrations/003_password_reset_tokens.sql`.
- 2026-05-02T00:48:00Z - Implemented API routes `POST /auth/forgot-password` and `POST /auth/reset-password` in `apps/api/src/routes/auth.ts`.
- 2026-05-02T00:50:00Z - Updated OpenAPI spec for password reset endpoints.
- 2026-05-02T01:05:00Z - Migrated web auth from better-auth to NextAuth v5 (`apps/web/auth.ts`, `apps/web/app/api/auth/[...all]/route.ts`, `apps/web/middleware.ts`).
- 2026-05-02T01:12:00Z - Replaced auth client shim and created registration endpoint `apps/web/app/api/auth/register/route.ts`.
- 2026-05-02T01:20:00Z - Rebuilt login/signup and added forgot/reset pages.
- 2026-05-02T01:28:00Z - Added SDK NextAuth token helper methods in `packages/sdks/paperdb/src/auth.ts`.
- 2026-05-02T01:34:00Z - Installed dependencies successfully after correcting BREVO package to `@getbrevo/brevo`.
- 2026-05-02T01:40:00Z - Validation run results:
  - `pnpm --filter @paperdb/web build` compiles auth changes but fails due existing lint errors across dashboard/docs files not introduced in this migration.
  - `pnpm --filter @paperdb/api test` fails because API server is not running in local test environment (`ECONNREFUSED localhost:3001`).
- 2026-05-02T01:45:00Z - Added migration guide: `docs/MIGRATION_BETTER_AUTH_TO_NEXTAUTH.md`.
- 2026-05-02T01:50:00Z - Removed remaining source references to `better-auth` and `@polar-sh` (clean scan across apps/packages excluding generated folders).
- 2026-05-02T01:55:00Z - Updated `apps/web/next.config.ts` to use `serverExternalPackages` (Next.js 15 deprecation fix).
- 2026-05-02T01:58:00Z - Refactored `apps/web/middleware.ts` to JWT token checks via `next-auth/jwt` so Edge middleware no longer imports Node-only auth dependencies.
- 2026-05-02T02:00:00Z - Re-ran web build: Edge/runtime warnings cleared; build still fails due pre-existing ESLint violations in dashboard/docs modules.
