---
id: Deployment
type: manual
status: draft
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[Manuals-MOC]]
---

# Deployment Guide

The Checkin App is designed to be deployed on **Vercel** (Frontend/API) with a **PostgreSQL** database (e.g., Supabase, Neon, or Railway).

## Prerequisites
- GitHub Repository connected to Vercel.
- PostgreSQL Database URL.
- Google Cloud Console Project (for OAuth).

## Environment Variables

Configure these in Vercel Project Settings:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Connection string to PostgreSQL (Prisma). |
| `NEXTAUTH_URL` | Canonical URL of the site (e.g., `https://my-app.vercel.app`). |
| `NEXTAUTH_SECRET` | Random string for encryption (generate with `openssl rand -base64 32`). |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud. |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud. |

## Steps

1.  **Database Migration**:
    - Run `npx prisma migrate deploy` locally (pointing to prod DB) or in build command.
    - **Recommended**: Connect Vercel to repository. It auto-detects Next.js.
    - Add `postinstall` script in `package.json`: `"prisma generate"`.

2.  **Build**:
    - Vercel Command: `next build` (default).
    - Output Directory: `.next` (default).

3.  **Cron Jobs (Optional)**:
    - If using Vercel Cron for daily reminders, configure `vercel.json`.

## Troubleshooting

### "Prisma Client not initialized"
- Ensure `npx prisma generate` runs during build.
- Check `DATABASE_URL` is correct.

### "OAuth Error"
- Ensure `NEXTAUTH_URL` matches the Vercel deployment URL.
- Add the Vercel URL to "Authorized Redirect URIs" in Google Cloud Console (`/api/auth/callback/google`).
