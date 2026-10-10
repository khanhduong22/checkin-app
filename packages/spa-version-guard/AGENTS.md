@../../AGENTS.md

# SPA Version Guard & Cache Eviction (packages/spa-version-guard)

================================================================================
1. ROLE & CORE CAPABILITIES
================================================================================
- **Role**: Headless and UI SPA Version Guard with Cache Busting, Anti-Loop Cooldown, Service Worker Sync, and Vite Build-Time Version Injection.
- **Consumers**: `@checkin/admin-spa`, `@checkin/staff-pwa`.
- **Core Capabilities**:
  - **Vite Plugin (`spaVersionPlugin`)**: Automatically generates a unique build identifier (`buildId`) and emits `version.json` into the build output directory (`dist/version.json`). Injects `__APP_BUILD_ID__` globally.
  - **Periodic Version Polling**: Regularly probes `/version.json` (or custom endpoint) in the background.
  - **Focus & Visibility Awakening**: Automatically triggers checks when the user switches tabs back or refocuses the window.
  - **Anti-Loop Cooldown Protection**: Tracks reload timestamps in `sessionStorage`. If an update occurred within the cooldown window (default: 5 minutes), suppresses automated reloads to prevent infinite reload thrashing.
  - **Cache Eviction Lifecycle**: Purges Cache Storage API (`caches.keys()`) and prompts Service Worker registrations to update/unregister before reloading.
  - **Banner & Modal UI**: Includes plug-and-play `<VersionGuardBanner />` and `<WhatsNewModal />` components for non-disruptive user updates.

================================================================================
2. SKIP GUARDS & SAFETY PROTOCOLS
================================================================================
To prevent breaking user flows during sensitive actions, checks are skipped if:
1. **Active Login**: User is actively completing authentication or redirect flows (`logging_in`).
2. **Mock User Mode**: Running in local/test mock user sessions (`mock_user`).
3. **Hidden Document**: Tab is backgrounded or minimized, conserving network bandwidth (`not_visible`).
4. **Cooldown Active**: App was recently reloaded due to a version upgrade (`cooldown`).
5. **Identical Version**: Server version matches `__APP_BUILD_ID__` (`same_version`).

================================================================================
3. CONSUMER INTEGRATION GUIDE
================================================================================

### Vite Configuration (`vite.config.ts`)
```ts
import { defineConfig } from 'vite';
import { spaVersionPlugin } from '@checkin/spa-version-guard/vite';

export default defineConfig({
  plugins: [
    spaVersionPlugin({
      version: '1.0.0',
    }),
  ],
});
```

### Application Root (`App.tsx`)
```tsx
import { useAppVersionGuard, VersionGuardBanner } from '@checkin/spa-version-guard';

export function App() {
  const { hasUpdate, serverVersion, applyUpdate } = useAppVersionGuard({
    pollIntervalMs: 180000, // 3 minutes
  });

  return (
    <>
      <VersionGuardBanner
        hasUpdate={hasUpdate}
        newVersion={serverVersion}
        onUpdate={applyUpdate}
      />
      {/* Rest of App */}
    </>
  );
}
```

================================================================================
4. VERIFICATION & TEST COMMANDS
================================================================================
```bash
# Run unit tests (Vitest)
pnpm --filter @checkin/spa-version-guard test

# Build package artifacts (tsup)
pnpm --filter @checkin/spa-version-guard build

# Typecheck source files
pnpm --filter @checkin/spa-version-guard typecheck
```
