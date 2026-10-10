@../../AGENTS.md

# Staff PWA Standards & Offline Architecture (apps/staff-pwa)

================================================================================
1. ROLE & APPLICATION OVERVIEW
================================================================================
- **Role**: Employee Attendance, Check-In, Shift Schedules & Task Operations.
- **Audience**: Retail staff, store workers, and shift supervisors.
- **Stack**: React 19 + Vite 6 + TailwindCSS 3 + PWA Service Worker (`vite-plugin-pwa` + Workbox) + SWR.
- **Runtime**: Static Progressive Web App (PWA) served via Nginx container (`limart-staff`) on internal port `3002`.
- **Reverse Proxy**: Proxied by Caddy on Contabo VPS (`ops_bridge` network) at `https://limart.khanhdp.com` (root staff interface).

================================================================================
2. CORE FEATURES & HARDWARE INTEGRATIONS
================================================================================
### A. QR Code Check-In Scanner
- Accesses device camera via standard MediaDevices API / HTML5 QR Scanner.
- **Camera Permission Guards**: Graceful fallbacks when camera permission is denied, restricted, or unavailable, prompting user to adjust device settings.
- Scans dynamic or signed QR tokens generated for physical store kiosks.

### B. Geolocation Radius Verification
- Uses HTML5 Geolocation API (`navigator.geolocation.getCurrentPosition`).
- Validates employee device coordinates against designated store geofence radius using `@checkin/shared` rules (`isWithinGeofence`).
- Prevents spoofing and handles location timeout/permission rejection gracefully with clear user guidance.

### C. In-App Browser Breakout Guard
- **The Problem**: Mobile in-app webviews (Facebook, Messenger, Zalo, Instagram, TikTok) partition cookies, block Google OAuth popups, and restrict PWA Service Worker registration.
- **The Guard**: Detects in-app webview User-Agents (`FBAN`, `FBAV`, `Zalo`, etc.).
- **Action**: Displays an overlay modal guiding the user to open the URL in native external browsers (Safari on iOS, Chrome on Android) using `intent://` or external browser breakout links.

### D. Offline Outbox Queue (`useOfflineQueue`)
- Intercepts check-in / task actions when device is offline.
- Persists pending transactions in IndexedDB / local storage with exponential backoff retry.
- Automatically flushes batch sync upon network reconnection with authorization headers preserved.

================================================================================
3. STRICT PRIVACY & AUTHENTICATION INVARIANTS
================================================================================
> [!IMPORTANT]
> 1. 🚫 **ZERO PUBLIC STAFF LISTS**: Never display employee directory rosters, user search bars, or passwordless user pickers on the login or public screens.
> 2. **Verified Google OAuth Only**: Authentication strictly requires verified Google OAuth matching active employee profiles in `checkin_db`.
> 3. **Session Integrity**: Session cookies (`HttpOnly`) and client tokens are validated on launch via `/api/me`.

================================================================================
4. SPA & PWA UPDATE GUARD
================================================================================
- **Integration**: Consumes `@checkin/spa-version-guard` and `vite-plugin-pwa`.
- **Update Lifecycle**:
  - Auto-polls `version.json` periodically and on visibility changes.
  - Upon detecting a new deployment, prompts the user via `<VersionGuardBanner />` or automatically reloads.
  - Flushes Service Worker caches and Cache Storage API to guarantee stale assets are never served.
  - Enforces `sessionStorage` cooldown anti-loop guard (5-minute window).

================================================================================
5. VERIFICATION & TEST COMMANDS
================================================================================
```bash
# Run unit & component test suite (Vitest)
pnpm --filter @checkin/staff-pwa test

# Typecheck & production build (Vite + TypeScript)
pnpm --filter @checkin/staff-pwa build

# Typecheck only
pnpm --filter @checkin/staff-pwa typecheck

# Local development server
pnpm --filter @checkin/staff-pwa dev
```
