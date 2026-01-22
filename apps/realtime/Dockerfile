# Production stage (no build needed - plain JS)
FROM node:20-alpine
WORKDIR /app

# Add non-root user
RUN addgroup --system --gid 1001 paperdb && \
    adduser --system --uid 1001 paperdb

# Copy files
COPY package.json ./
COPY index.js ./

# Install production dependencies only
RUN npm install --omit=dev

USER paperdb

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002
CMD ["node", "index.js"]
