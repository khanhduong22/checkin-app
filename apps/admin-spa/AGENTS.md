@../../AGENTS.md

# Admin SPA Standards & Architecture (apps/admin-spa)

================================================================================
1. ROLE & APPLICATION OVERVIEW
================================================================================
- **Role**: Store Operations & Staff Management Admin Dashboard.
- **Audience**: Store owners, branch managers, and administrative operators.
- **Stack**: React 19 + Vite 6 + TailwindCSS 3 + Radix UI + TanStack Table v8 + SWR.
- **Runtime**: Static Single Page Application (SPA) served via Nginx container (`limart-admin`) on internal port `3001`.
- **Reverse Proxy**: Proxied by Caddy on Contabo VPS (`ops_bridge` network) at `https://limart.khanhdp.com/admin` (or dedicated admin route).

================================================================================
2. STRICT PRIVACY & AUTHENTICATION INVARIANTS
================================================================================
> [!IMPORTANT]
> **Strict Zero-Trust Privacy Guardrail**:
> 1. 🚫 **ZERO PUBLIC STAFF LISTS**: Never expose employee lists, user directories, search selectors, or account quick-switchers in unauthenticated views or initial landing states.
> 2. **Verified Google OAuth Only**: Admin and staff authentication strictly requires verified Google OAuth credentials matching active database records with administrator privileges.
> 3. **Role-Based Access Control (RBAC)**: All administrative endpoints and views must verify `role: ADMIN` or `role: MANAGER` from server-validated sessions. Never trust client-side role claims alone.

================================================================================
3. SPA UPDATE GUARD & CACHE EVICTION
================================================================================
- **Package Integration**: Consumes `@checkin/spa-version-guard`.
- **Build Injection**: Uses Vite plugin to emit `version.json` containing `buildId`, `version`, and `buildTime`.
- **Runtime Monitoring**:
  - `useAppVersionGuard` periodically polls `/version.json` (3-minute interval, plus on visibility/focus change).
  - Renders `<VersionGuardBanner />` when a new deployment is detected.
  - Enforces `sessionStorage` cooldown anti-loop protection (5-minute cooldown window) to prevent infinite reload loops.
  - Safely clears Cache API storage before applying updates.

================================================================================
4. ARCHITECTURE & CODE CONVENTIONS
================================================================================
- **Component Primitives**: Radix UI headless components styled via TailwindCSS (`clsx` + `tailwind-merge` via `cn` helper).
- **Data Tables**: TanStack Table v8 (`@tanstack/react-table`) for sorting, filtering, and pagination of large datasets (attendance logs, payroll records, employee directories).
- **Data Fetching & State**: SWR (`swr`) with centralized `swrFetcher` for optimistic UI updates, auto-revalidation, and cache deduplication.
- **Code-Splitting**: Route-level lazy loading (`React.lazy` + `Suspense`) in `src/App.tsx` for optimal initial bundle loading performance.
- **Toast Notifications**: Sonner (`sonner`) for non-intrusive feedback on mutations and action results.

================================================================================
5. VERIFICATION & BUILD COMMANDS
================================================================================
```bash
# Typecheck & production build (Vite + TypeScript)
pnpm --filter @checkin/admin-spa build

# Typecheck only
pnpm --filter @checkin/admin-spa typecheck

# Local development server
pnpm --filter @checkin/admin-spa dev
```
