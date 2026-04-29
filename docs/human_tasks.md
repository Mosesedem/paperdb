# PaperDB V1 — Human Tasks

This document outlines the remaining manual tasks, deployment validations, and infrastructure provisioning steps that require a human operator. These items must be completed before declaring PaperDB V1 ready for public launch.

## 1. Infrastructure Provisioning

### Database & Caching
- [ ] **Provision Production PostgreSQL Database**: Ensure it supports connections via the `postgres.js` client.
- [ ] **Provision Production Redis Cluster**: Required for cron job workers, webhook queues, and rate-limiting.

### Storage Backend
- [ ] **Provision S3 Bucket**: Create an AWS S3, Cloudflare R2, or MinIO bucket for file storage.
- [ ] **Configure IAM Credentials**: Generate an Access Key ID and Secret Access Key with read/write permissions for the bucket.
- [ ] **Configure CORS on Bucket**: Ensure the storage bucket allows cross-origin requests from client applications if files will be accessed directly via the browser.

### OAuth Social Login
- [ ] **Configure Google OAuth Credentials**: Create a project in GCP, configure the OAuth consent screen, and generate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Add the API callback URL to the authorized redirect URIs.
- [ ] **Configure GitHub OAuth Credentials**: Create an OAuth app in GitHub developer settings, generate `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, and configure the authorization callback URL.

## 2. Deployment Validations

### Initial Database Migration
- [ ] **Verify Clean Boot on Fresh DB**: Point the `DATABASE_URL` to a fresh, empty database and run `pnpm migrate` from `apps/api`. Verify that all tables, indexes, and initial constraints are created without errors from `001_initial.sql`.

### Docker Compose & Self-Hosting
- [ ] **Verify Docker Compose Fresh Boot**: Start the entire stack (API, Realtime, Cron, DB, Redis) using `docker-compose up`. Ensure all services discover each other and start cleanly.
- [ ] **Verify BYOD/Self-Hosted Guide**: Read through the self-hosting documentation and execute the steps exactly as written to ensure a developer can deploy PaperDB on their own VPS without friction.

### Managed Deployment
- [ ] **Verify Managed Deployment Guide**: Test the deployment process onto the target managed infrastructure (e.g., Vercel, Railway, Render, or AWS ECS).

## 3. Environment Variable Configuration

- [ ] **Generate Secure Secrets**: Generate 256-bit cryptographically secure strings for `JWT_SECRET` and `SOCKET_SECRET` (ensure they match between `apps/api` and `apps/realtime`).
- [ ] **Set `CORS_ORIGINS`**: Define the strict comma-separated list of allowed origins for the production environment.
- [ ] **Populate Production `.env`**: Distribute the production environment variables to all relevant services (API, Realtime, Cron, Web).
