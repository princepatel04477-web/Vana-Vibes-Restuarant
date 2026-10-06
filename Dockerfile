# ==============================================================================
# Production Multi-Stage Dockerfile (Next.js 16 Standalone Output)
# Variables are automatically loaded from .env.example (or .env.local if present).
# No need to manually create a .env file!
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency Caching
# ------------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack for deterministic pnpm package manager
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ------------------------------------------------------------------------------
# Stage 2: Application Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public

# Ensure Next.js build reads environment variables from .env.example if .env.local is absent
RUN if [ ! -f .env.local ] && [ -f .env.example ]; then cp .env.example .env.local; fi

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user for security hardening
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs cluster.js ./cluster.js

ENV UV_THREADPOOL_SIZE=64 \
    NODE_OPTIONS="--max-old-space-size=2048"

USER nextjs

EXPOSE 3000

# Automated health probe using Next.js health API
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "cluster.js"]
