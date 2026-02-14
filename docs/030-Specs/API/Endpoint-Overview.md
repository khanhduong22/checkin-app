---
id: Endpoint-Overview
type: spec
status: draft
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[Specs-MOC]]
---

# API & Server Actions Overview

The application primarily uses **Server Actions** for data mutations and interactions, with a few traditional API routes for specific administrative or setup tasks.

## Server Actions

### Task Management (`src/actions/task-actions.ts`)

| Function | Description | Access |
| :--- | :--- | :--- |
| `createTaskDefinition` | Admins create new task templates. | `ADMIN` only |
| `updateTaskDefinition` | Admins modify existing templates. | `ADMIN` only |
| `createTaskItem` | Admins post tasks to marketplace. | `ADMIN` only |
| `claimTaskItem` | Users claim an available task. | Authenticated Users |
| `submitUserTask` | Users submit proof for a claimed task. | Task Owner |
| `reviewUserTask` | Admins approve/reject/modify task submissions. | `ADMIN` only |

*(Note: Other actions exist for Requests, Check-ins, etc. but follow similar patterns)*

## API Routes

### `/api/auth/[...nextauth]`
- **Method**: `GET`, `POST`
- **Description**: Handles OAuth authentication flows via NextAuth.js.

### `/api/setup-admin`
- **Method**: `GET` (assumed)
- **Description**: Initial setup utility to promote the first user to Admin status (likely protected or one-time use).

### `/api/admin/...`
- **Description**: Administrative endpoints for specific data retrieval or operations not handled by Server Actions (e.g., specific reporting or bulk updates).
