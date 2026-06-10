# Research Analysis: Dockerization & CI/CD Deployment to Contabo VPS

This document synthesizes findings and best practices for Dockerizing a Next.js (App Router) application, configuring continuous integration/deployment (CI/CD) to a Contabo VPS, and managing domains/routing via Nginx Proxy Manager.

## 1. Next.js Standalone Containerization
Next.js supports a built-in `standalone` output mode that drastically reduces image size and runtime dependency overhead.

### Key Insights
- **Output Mode Configuration**: Adding `output: 'standalone'` in `next.config.mjs` traces all required code and dependencies, producing a minimal `.next/standalone` folder.
- **Image Size Reduction**: A typical Next.js image drops from over 1.2 GB to ~120 MB when using multi-stage builds with `node:20-alpine` as the base image.
- **Prisma Client Handling**: During the build phase, Prisma client binaries must be generated (`prisma generate`). To prevent runtime errors, the generated client folder must be copied or kept in node_modules, and `openssl` (or equivalent engine library) must be present in the runner image.
- **Static Assets & Public Folder**: The standalone bundle excludes the `public/` directory and `.next/static/` directory by default to allow serving them via a CDN. Since we are running directly on the VPS, we copy these folders explicitly into the final runner image so that the Next.js server can serve them.

## 2. VPS Network and Reverse Proxy Topology
The VPS manages routing via Nginx Proxy Manager (NPM), running on a shared Docker network named `ops_bridge`.

### Integration Strategy
- **Container Networking**: The `checkin-app` container will join the `ops_bridge` network.
- **Service Naming**: Setting the container name to `checkin-app` allows NPM to resolve and proxy traffic via http://checkin-app:3000 without exposing the port publicly.
- **Port Mapping**: Exposing the internal port `3000` (no public port mapping needed, as NPM routing is internal to the docker network).

## 3. CI/CD Deployment Flow
Automating the deployment of code changes to the VPS requires a secure and fast pipeline.

### Steps
1. **GitHub Actions Trigger**: On push to `main` branch.
2. **Quality Gates**: Run tests (`npm run test`) and compile checks (`npm run build` or verification) first.
3. **SSH Action**: Connect to the VPS via SSH (`appleboy/ssh-action`) using credentials stored in GitHub Secrets.
4. **Deploy Script**:
   - Navigate to the application directory `/opt/checkin-app`.
   - Perform a clean `git pull`.
   - Execute `docker compose up -d --build` to rebuild the Docker image on the server using cached layers.
   - Run database migrations safely.

## 4. Terraform Domain Management
Using the `kido-infra` Terraform workspace to manage configurations ensures everything is versioned:
- **Cloudflare DNS**: Map `checkin.khanhdp.com` to the VPS IP address (`shared_vps_host`).
- **Nginx Proxy Manager**: Create a Proxy Host mapping `checkin.khanhdp.com` -> `http://checkin-app:3000` with WebSocket support and SSL certificate mapping.
