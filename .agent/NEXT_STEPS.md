# Project Status: Transition to PWA + Auth + Push

## Completed in Previous Session
- [x] **Frontend**:
    - Installed `vite-plugin-pwa` and configured `vite.config.js`.
    - Installed `@supabase/supabase-js` and configured `src/lib/supabase.js`.
    - Created `AuthPage.jsx` and `/auth` route.
    - Generated VAPID Keys (`frontend/src/lib/pushConfig.js`).
- [x] **Backend**:
    - Installed `web-push`.
    - Fixed `package.json` dependencies (both root and frontend).
- [x] **Database**:
    - Created Schema file `sql/auth_and_push_schema.sql` (BUT NOT EXECUTED YET).

## Next Steps (For New Thread)
1.  **Database**:
    - Execute `sql/auth_and_push_schema.sql` on Supabase SQL Editor to create `push_subscriptions` table.
2.  **Backend Implementation**:
    - Create `/api/subscribe` endpoint in `api/index.js` to store subscriptions.
    - Update `scripts/vps-worker.js` to use `web-push` for sending notifications.
    - Add private VAPID key to `.env`.
3.  **Frontend Integration**:
    - Wire "Enable Notifications" button in `PriceCard.jsx` to call `/api/subscribe`.
    - Add "Sync Portfolio" logic after Login.

## Environment Variables Needed
- `VITE_SUPABASE_URL` (Frontend)
- `VITE_SUPABASE_ANON_KEY` (Frontend)
- `VAPID_PRIVATE_KEY` (Backend)
- `VAPID_PUBLIC_KEY` (Frontend/Backend)
