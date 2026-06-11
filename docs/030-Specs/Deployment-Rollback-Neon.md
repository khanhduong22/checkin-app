---
id: Deployment-Rollback-Neon
type: specification
status: active
project: Checkin App
created: 2026-06-11
updated: 2026-06-11
linked-to: [[Specs-MOC]], [[Deployment]]
---

# Technical Specification: Rollback to Vercel + Neon DB

This document details the architectural rollback of the primary **Checkin App** deployment from the Contabo VPS to **Vercel** pointing to the cloud-hosted **Neon DB**, and the setup of a daily synchronization job to keep the VPS deployment updated as a parallel instance.

## Title & Scope Overview

* **Background**: The application was previously migrated from Vercel to a self-hosted Contabo VPS (`limart.khanhdp.com`) using a local Dockerized PostgreSQL database.
* **Problem Statement**: Running two active deployments with separate databases led to data split-brain issues. Check-ins and check-outs recorded by staff on the Vercel/PWA deployment (pointing to Neon) were invisible to administrators viewing the dashboard on the VPS domain, causing inconsistent payroll and attendance stats.
* **Solution**: 
  1. Revert the primary environment to Vercel + Neon DB by removing Vercel host redirects.
  2. Keep the VPS deployment running as an independent, parallel backup instance.
  3. Schedule a daily cron job at **23:00 GMT+7** (16:00 UTC) on the VPS to dump the Neon DB and overwrite the local VPS database, ensuring the backup instance remains in sync with production.

---

## Workflows & Visualizations

### 1. Use Case Diagram

```plantuml
@startuml
!theme crt-green
left to right direction
skinparam packageStyle rectangle

actor "Staff / Employee" as Staff
actor "Admin / Manager" as Admin
actor "VPS Cron Scheduler" as Cron

rectangle "Checkin App Deployment" {
    usecase "Perform Check-in/Check-out" as UC1
    usecase "View Attendance & Payroll Stats" as UC2
    usecase "Synchronize Neon DB to VPS DB" as UC3
}

actor "Vercel + Neon DB (Primary)" as ProdSys
actor "VPS Host + Local DB (Replica)" as VPSSys

Staff --> UC1
Admin --> UC2
Cron --> UC3

UC1 --> ProdSys
UC2 --> ProdSys
UC3 --> ProdSys : <<read>>
UC3 --> VPSSys : <<write>>
@enduml
```

### 2. Overview Flow (System Synchronization Flow)

```mermaid
flowchart TD
    Start([Start Sync Cron - 23:00 GMT+7]) --> ReadEnv[Read Neon & VPS DB Credentials]
    ReadEnv --> TestConnection{Test Connection to Neon DB}
    
    TestConnection -- Fail --> LogError[Log Connection Error & Alert Admin] --> End([End with Error])
    
    TestConnection -- Success --> DumpNeon[Dump Neon DB via pg_dump]
    DumpNeon --> RestoreVPS{Restore Dump to VPS checkin_db}
    
    RestoreVPS -- Success --> LogSuccess[Log Sync Success] --> EndSuccess([End Successfully])
    RestoreVPS -- Fail --> LogRestoreError[Log Restore Error & Alert Admin] --> End([End with Error])
```

### 3. Component Interaction (Cron Sync Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Cron
    participant Host as VPS Host Operating System
    participant AppContainer as VPS checkin-app Container
    participant DBContainer as VPS checkin-db Container
    participant Neon as Neon DB (Cloud Postgres)

    Admin->>Host: Trigger Cron at 23:00 GMT+7
    Host->>DBContainer: Execute pg_dump command pointing to Neon DB URL
    DBContainer->>Neon: Connect & fetch database backup stream
    Neon-->>DBContainer: Return database backup SQL dump
    DBContainer->>DBContainer: Save backup to /tmp/neon_dump.sql
    Host->>DBContainer: Execute psql command to restore /tmp/neon_dump.sql
    DBContainer->>DBContainer: Overwrite public schema and tables
    DBContainer-->>Host: Confirm Restore Completed
    Host->>DBContainer: Delete /tmp/neon_dump.sql
    DBContainer-->>Host: File deleted
    Host-->>Admin: Log success & Status Report
```

---

## Technical Changes

The redirect rules configured in `next.config.mjs` and `vercel.json` have been removed to restore normal routing on Vercel.

```diff
diff --git a/next.config.mjs b/next.config.mjs
-  async redirects() {
-    return [
-      {
-        source: '/:path*',
-        has: [
-          {
-            type: 'header',
-            key: 'host',
-            value: '(?<vercelHost>.*\\.vercel\\.app)',
-          },
-        ],
-        destination: 'https://limart.khanhdp.com/:path*',
-        permanent: true,
-      },
-    ];
-  },
diff --git a/vercel.json b/vercel.json
-    "redirects": [
-        {
-            "source": "/:path*",
-            "destination": "https://limart.khanhdp.com/:path*",
-            "permanent": true
-        }
-    ],
```

---

## Manual Operation Guide

### Immediate Data Synchronization Script
An immediate data migration and deduplication script has been created at [migrate_checkins.js](file:///Users/kido/checkin-app/scripts/migrate_checkins.js) and resolved with [resolve_duplicates.js](file:///Users/kido/checkin-app/scripts/resolve_duplicates.js). It handles timezone shifts correctly by treating all dates in UTC.

To trigger a manual database sync from Neon to the VPS database:
```bash
/opt/checkin-app/scripts/sync-db.sh
```

---

## Cloud / Infrastructure Setup

### Environment Variables
Vercel production and local environments both point to the Neon DB:

| Parameter | Vercel Value | VPS Local Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon DB Connection String | VPS Local checkin-db Connection String |
| Primary Domain | `checkin-lim-art.vercel.app` | `limart.khanhdp.com` |

---

## Troubleshooting

1. **Daily Cron Failures**:
   - Check VPS cron log: `tail -n 50 /var/log/cron` or `journalctl -u cron`
   - Test connectivity from the VPS to Neon: `docker exec checkin-db pg_isready -h ep-orange-dust-a1m4z6so-pooler.ap-southeast-1.aws.neon.tech`
2. **Schema out of sync**:
   - If schema changes are pushed to `main`, they will automatically sync to VPS. If VPS is out of sync, run:
     ```bash
     docker compose exec checkin-app npx prisma db push --skip-generate
     ```
