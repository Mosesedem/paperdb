# Base stage
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cron/package.json ./apps/cron/
RUN pnpm install --frozen-lockfile --prod=false

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cron/node_modules ./apps/cron/node_modules
COPY . .
WORKDIR /app/apps/cron
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Add non-root user
RUN addgroup --system --gid 1001 paperdb && \
    adduser --system --uid 1001 paperdb

# Copy built files
COPY --from=builder /app/apps/cron/dist ./dist
COPY --from=builder /app/apps/cron/package.json ./
COPY --from=builder /app/apps/cron/node_modules ./node_modules

USER paperdb

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
