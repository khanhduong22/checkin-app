# Multi-stage Dockerfile for @checkin/admin-spa
# Stage 1: Build static assets using Vite
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Copy workspace configurations
COPY package.json pnpm-workspace.yaml tsconfig.base.json turbo.json* ./
COPY packages/spa-version-guard/package.json ./packages/spa-version-guard/
COPY apps/admin-spa/package.json ./apps/admin-spa/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/spa-version-guard/ ./packages/spa-version-guard/
COPY apps/admin-spa/ ./apps/admin-spa/

# Build spa-version-guard first, then build Vite SPA bundle
RUN pnpm --filter @checkin/spa-version-guard build
RUN pnpm --filter @checkin/admin-spa build

# Stage 2: Serve static files with Nginx Alpine (~15MB RAM footprint)
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration
COPY apps/admin-spa/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets into /admin subdirectory for prefix routing
COPY --from=builder /app/apps/admin-spa/dist /usr/share/nginx/html/admin

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
