# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies needed for native modules (better-sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++

# --- Dependencies stage ---
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --- Build stage ---
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (provide dummy DATABASE_URL for build-time)
ENV DATABASE_URL="file:./build.db"
ENV SKIP_ENV_VALIDATION="true"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# libsql/better-sqlite3 native bindings need libc6-compat at runtime
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, config, and generated client (needed at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

# Copy full node_modules for prisma db push and native module support.
# The standalone output handles JS bundling; node_modules is needed only
# for prisma CLI (with its deep transitive deps) and native addons.
COPY --from=builder /app/node_modules ./node_modules

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Create writable data directory for SQLite and set default DATABASE_URL
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
ENV DATABASE_URL="file:/app/data/prod.db"

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./start.sh"]
