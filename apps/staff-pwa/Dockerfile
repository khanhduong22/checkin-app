# Multi-stage Dockerfile for @checkin/staff-pwa
# Stage 1: Build static assets using Vite PWA
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy workspace configurations
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/spa-version-guard/package.json ./packages/spa-version-guard/
COPY apps/staff-pwa/package.json ./apps/staff-pwa/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/spa-version-guard/ ./packages/spa-version-guard/
COPY apps/staff-pwa/ ./apps/staff-pwa/

# Build shared library first, then build Vite PWA bundle
RUN pnpm --filter @checkin/shared build
RUN pnpm --filter @checkin/spa-version-guard build
RUN pnpm --filter @checkin/staff-pwa build

# Stage 2: Serve static files with Nginx Alpine (~15MB RAM footprint)
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration with strict PWA caching rules
COPY apps/staff-pwa/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets
COPY --from=builder /app/apps/staff-pwa/dist /usr/share/nginx/html

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3002/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
