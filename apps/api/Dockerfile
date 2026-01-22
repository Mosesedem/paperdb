# Base stage - shared dependencies
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/sdks/notdb/package.json ./packages/sdks/notdb/
RUN pnpm install --frozen-lockfile --prod=false

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
WORKDIR /app/apps/api
RUN pnpm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 paperdb && \
    adduser --system --uid 1001 paperdb

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules

# Set user
USER paperdb

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

# Start
ENV NODE_ENV=production
ENV PORT=3001
CMD ["node", "dist/index.js"]
