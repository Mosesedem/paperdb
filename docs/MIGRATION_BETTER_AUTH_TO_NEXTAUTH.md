# Migration Guide: better-auth to NextAuth v5

This project migrated dashboard authentication from better-auth to NextAuth v5.

## What changed

1. Dashboard auth provider moved to NextAuth route handlers.
2. Legacy better-auth dependencies were removed from `apps/web/package.json`.
3. Signup now uses `POST /api/auth/register` and credential login uses NextAuth.
4. Password reset now uses API endpoints backed by BREVO email delivery:
   - `POST /auth/forgot-password`
   - `POST /auth/reset-password`

## Environment changes

Replace older better-auth variables with:

- `AUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`

And for email delivery:

- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
- `DASHBOARD_URL`

## Deployment notes

1. Run migrations so `password_reset_tokens` exists.
2. Verify OAuth app callbacks still point to `/api/auth/*`.
3. Test login, signup, forgot-password, and reset-password flows end-to-end.
