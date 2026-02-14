---
id: Component-View
type: spec
status: draft
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[SDD-CheckinApp]]
---

# Component Architecture

## C4 Container/Component Diagram

```mermaid
C4Container
    title Component Diagram - Checkin App

    Container_Boundary(app, "Next.js App Router") {
        Component(pages, "Page Components", "React/Next.js", "Server Components handling routing and layout")
        Component(client_comps, "Client Components", "React", "Interactive UI (Forms, Dialogs, Charts)")
        Component(server_actions, "Server Actions", "TypeScript", "Backend logic, validations, DB transactions")
        Component(api_routes, "API Routes", "Next.js API", "External-facing endpoints (if any)")
        Component(auth, "Auth Layer", "NextAuth.js", "Session management")
    }

    ContainerDb(db, "PostgreSQL", "SQL Database", "Stores Users, Checkins, Tasks, Logs")

    Rel(pages, server_actions, "Invokes", "RPC-like")
    Rel(client_comps, server_actions, "Invokes", "RPC-like")
    Rel(server_actions, db, "Queries", "Prisma")
    Rel(pages, db, "Direct Read", "Prisma (RSC)")
```

## detailed Component Interaction (Example: Task Marketplace)

1. **User** navigates to `/tasks`.
2. **`page.tsx` (RSC)** fetches `TaskItems` directly from Prisma.
3. **`MarketplaceList.tsx` (Client)** renders the items.
4. **User** clicks "Claim Task".
5. **`MarketplaceList`** calls `claimTask` **Server Action**.
6. **`claimTask`**:
    - Validates session.
    - Updates DB (`TaskItem.assignee`).
    - Creates `UserTask` record.
    - Revalidates path `/tasks`.
7. **UI** updates optimistically or via refresh.
