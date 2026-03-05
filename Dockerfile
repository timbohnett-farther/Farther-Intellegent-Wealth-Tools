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

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema and generated client (needed at runtime)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
