# Analysis: User Deactivation in NextAuth and Prisma

This document analyzes the best practices for deactivating user accounts in a Next.js application using NextAuth.js (with database session strategy) and Prisma ORM, while keeping historical data intact.

## Core Problem
When employees resign, we must prevent them from logging into the system or continuing their current sessions. However, their historical records (such as check-ins, work shifts, task lists, and payslips) must be preserved for auditing, compliance, and reporting. 

Directly deleting a user (e.g. `prisma.user.delete`) is destructive because CASCADE delete constraints remove all their associated records.

## Technical Solution

### 1. Database Schema Update
Add an `isActive` flag to the `User` model in `prisma/schema.prisma`:
```prisma
model User {
  // ...
  isActive Boolean @default(true)
  // ...
}
```
Using `npx prisma db push` or `npx prisma migrate dev` in development will safely add this field with a default value of `true` to all existing users without data loss.

### 2. Login Blockage (NextAuth `signIn` Callback)
In `src/lib/auth.ts`, check the user's `isActive` status inside the `signIn` callback:
```typescript
async signIn({ user }) {
  if (user.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { isActive: true }
    });
    if (dbUser && dbUser.isActive === false) {
      return false; // Returns false to reject login and redirect to error page
    }
  }
  return true;
}
```

### 3. Immediate Session Revocation
Since the application uses `database` sessions (`Session` table in Prisma), users who are currently logged in might still have valid session cookies. 
To immediately kick out a deactivated employee:
```typescript
await prisma.session.deleteMany({
  where: { userId }
});
```
This forces the client browser to re-authenticate on the next request, at which point the `signIn` callback will reject them.

### 4. Admin UI Controls
Instead of only providing a "Delete User" button, the admin UI should:
- Display a status label/badge for each user: "Đang làm việc" (Active) or "Đã nghỉ việc" (Resigned / Inactive).
- Provide a toggle or button to mark an employee as "Resigned" (deactivated) or "Active".
- Show a confirmation dialog explaining that marking them as resigned will block their login and immediately kick them out, but keep their data.
- Allow filtering or separating resigned employees from the active list to keep the UI clean.
- Filter inactive employees out of list dropdowns when assigning shifts, tasks, etc.
