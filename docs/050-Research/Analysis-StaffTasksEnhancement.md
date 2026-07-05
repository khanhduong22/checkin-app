# Analysis: Staff Tasks Recurring Logic & Time Filters

This document analyzes the design and implementation details for:
1. Automatically duplicating recurring weekly tasks for "Thư" upon approval.
2. Expanding the time filter dropdown in the "Công việc và KPI" dashboard to include "Last week" and "This month".

## 1. Recurring Weekly Tasks Auto-Copy
When an admin approves a task assigned to Thư (`cuccung123456789@gmail.com`), we want it to automatically copy to the next week if the task title is one of the 4 standard weekly duties:
- `"Làm video"`
- `"Live stream 2 buổi"`
- `"Đăng story"`
- `"Đăng bài FB, Ins, Thread"`

### Trigger Point
The change should be implemented in `updateStaffTask` Server Action in `src/actions/staff-task-actions.ts`:
- Check if `data.status === "APPROVED"` and `task.status !== "APPROVED"`.
- Query user email of `task.assigneeId` to see if it is `cuccung123456789@gmail.com`.
- Normalize the task title (`trim().toLowerCase()`) and check if it is one of the 4 recurring titles.
- Compute the new task's `startDate` and `deadline` by adding 7 days to the original dates.
- Check if a cloned task with the same title, assignee, and dates already exists to prevent duplicate triggers (idempotency check).
- Create the new task with status `TODO`.

---

## 2. Expanded Time Filters
Both the admin (`AdminStaffTaskClient.tsx`) and employee (`StaffTaskClient.tsx`) views have a time filter dropdown (`selectedWeekFilter`).
Currently, it only supports `"THIS_WEEK"`, `"NEXT_WEEK"`, and `"ALL"`.
We will expand this to support `"LAST_WEEK"` and `"THIS_MONTH"`.

### Date Boundary Calculations (VN Timezone +07:00)
- **Last Week**:
  ```typescript
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);
  ```
- **This Month**:
  ```typescript
  const thisMonthStartLocal = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), 1));
  thisMonthStartLocal.setUTCHours(0, 0, 0, 0);
  const thisMonthStart = new Date(thisMonthStartLocal.getTime() - VN_OFFSET_MS);

  const thisMonthEndLocal = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth() + 1, 0));
  thisMonthEndLocal.setUTCHours(23, 59, 59, 999);
  const thisMonthEnd = new Date(thisMonthEndLocal.getTime() - VN_OFFSET_MS);
  ```

### Filter Condition
```typescript
if (selectedWeekFilter === "LAST_WEEK") {
  return taskStart >= lastWeekStart && taskStart <= lastWeekEnd;
}
if (selectedWeekFilter === "THIS_MONTH") {
  return taskStart >= thisMonthStart && taskStart <= thisMonthEnd;
}
```
