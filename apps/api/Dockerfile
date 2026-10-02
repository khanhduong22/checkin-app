# Multi-stage Dockerfile for @checkin/api
# Ultra-optimized Node.js / Bun Alpine build

# ----------------- Stage 1: Build -----------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy workspace configurations
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install all workspace dependencies
RUN pnpm install

# Copy source trees
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY apps/api/ ./apps/api/

# Build shared, generate prisma client, build db & api
RUN pnpm --filter @checkin/shared build
RUN pnpm --filter @checkin/db generate
RUN pnpm --filter @checkin/db build
RUN pnpm --filter @checkin/api build

# ----------------- Stage 2: Runner -----------------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
# Optimize Node.js heap limit for VPS (~128MB-256MB RAM)
ENV NODE_OPTIONS="--max-old-space-size=256 --enable-source-maps"

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 apiapp

# Copy built workspace & runtime node_modules
COPY --from=builder --chown=apiapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiapp:nodejs /app/packages ./packages
COPY --from=builder --chown=apiapp:nodejs /app/apps/api ./apps/api
COPY --from=builder --chown=apiapp:nodejs /app/package.json ./package.json

USER apiapp

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
