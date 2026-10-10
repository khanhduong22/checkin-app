@../../AGENTS.md

# Zero-Downtime Deployment Orchestrator (packages/zero-downtime-deploy)

================================================================================
1. ROLE & ARCHITECTURAL OVERVIEW
================================================================================
- **Role**: Universal Zero-Downtime Deployment Toolkit & Orchestrator.
- **Scope**:
  - Docker Blue-Green Atomic Container Swap on Contabo VPS (`ops_bridge`).
  - Kernel Inode Atomic Directory Swap for static web assets.
  - Active Healthcheck Probe with automated rollback on failure.
  - Graceful Server Shutdown coordinator (`graceful-shutdown.ts`).
  - GitHub Actions CI/CD deployment workflow generator.

================================================================================
2. BLUE-GREEN CONTAINER SWAP LIFECYCLE
================================================================================
The container swap sequence guarantees 0-second downtime for API services (e.g. `limart-api` on port `4000`):

```text
[Start Candidate]  -->  [Probe Healthcheck]  -->  [Atomic Rename]  -->  [Reload Caddy]  -->  [Drain & Prune]
${APP}_next :4000       /health (45s timeout)     ${APP} -> backup      Zero-Downtime        docker rm -f backup
                                                  ${APP}_next -> ${APP}
```

1. **Candidate Container Startup**:
   - Launches candidate container `${ACTIVE}_next` on internal network (`ops_bridge`).
2. **Healthcheck Probe**:
   - Continuously probes `/health` endpoint until HTTP 200 is returned.
   - **Timeout Guard**: 45-second timeout window. If candidate fails to report healthy, aborts swap, retrieves logs (`docker logs --tail 60`), and terminates `${ACTIVE}_next` without touching the live active container.
3. **Atomic Container Swap**:
   - Renames current running container: `docker rename ${ACTIVE} ${BACKUP}`.
   - Atomically promotes candidate: `docker rename ${ACTIVE}_next ${ACTIVE}`.
4. **Caddy Reverse Proxy Reload**:
   - Reloads Caddy configuration with zero dropped connections: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`.
5. **Drain & Cleanup**:
   - Allows existing in-flight connections to drain, then safely removes `${BACKUP}`.

================================================================================
3. GRACEFUL SERVER SHUTDOWN (`graceful-shutdown.ts`)
================================================================================
- Traps OS termination signals (`SIGTERM`, `SIGINT`).
- Closes HTTP server to reject new incoming connections while allowing active requests to finish.
- Executes asynchronous cleanup callbacks (database connection pooling teardown, Valkey cache disconnect, background task completion).
- Prevents double execution if multiple termination signals arrive concurrently.

================================================================================
4. VERIFICATION & TEST COMMANDS
================================================================================
```bash
# Run unit & integration test suites (Vitest)
pnpm --filter @checkin/zero-downtime-deploy test

# Build CLI & library bundles (tsup)
pnpm --filter @checkin/zero-downtime-deploy build

# Typecheck source files
pnpm --filter @checkin/zero-downtime-deploy typecheck
```
