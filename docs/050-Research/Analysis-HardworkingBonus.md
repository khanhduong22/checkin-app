# Research Analysis: Hardworking Bonus Rule

This document outlines the findings and implementation plan for the **Hardworking Bonus** (Thưởng Chăm Chỉ) rule: **Top 1 hardworking employee (Part-time, by total hours) who has worked at least 130 hours in a month will receive a 200,000 VND reward**.

## Core Logic & Rules

1. **Eligibility Criteria**:
   - Must be a **Part-Time** employee (`employmentType` is not `FULL_TIME`).
   - Exclude administrators (`role !== 'ADMIN'`).
   - Exclude inactive/resigned employees for that month (e.g., matching the `excludedNames` array depending on the year/month: `['Nía', 'Na']` or `['Nía']`).

2. **Winning Criteria**:
   - The user who has the **highest `totalHours`** among all eligible users in the evaluated month.
   - The winner's `totalHours` must be **at least 130 hours**.
   - If there is a tie for the top hours, both (or all) tied users will be rewarded 200,000 VND to ensure fairness.

3. **Reward Distribution**:
   - The reward is **200,000 VND** per winner.
   - It will be added as a synthetic `PayrollAdjustment` under the user's `adjustments` list with the reason `"Thưởng Top 1 Chăm Chỉ (Làm tối thiểu 130h)"`.
   - The reward amount is added to `totalSalary` and `projectedSalary` (and `finalNet` when closed).

## System Integration

### 1. Calculation & State Management
- **Shared Payroll calculation**: Inside `calculatePayroll` in `src/lib/payroll.ts`, we calculate all users' statistics, then apply the hardworking bonus logic to modify the winner(s)' stats.
- **Admin View live calculation**: Inside `src/app/admin/payroll/page.tsx`, we post-process the live calculations in `payrollData` using the same helper logic.
- **Single User Live View**: In `src/app/payroll/page.tsx` and `src/app/admin/payroll/[userId]/page.tsx`, we replace `getUserMonthlyStats` with `calculatePayroll` so the hardworking bonus is dynamically computed based on the month's overall leaderboard.
- **Closed Month Persistence**: When a month is closed via `closePayrollMonth` server action, the snapshot will automatically save the hardworking bonus in the `Payslip` table.

### 2. UI/UX Highlights
- **Rewards Page (`src/app/rewards/page.tsx`)**: Display a prominent badge `🏆 +200k thưởng` next to the Top 1 hardworking user if they have worked $\ge 130$ hours.
- **Admin Reports Page (`src/app/admin/reports/page.tsx`)**: Display the same badge on the Top Chăm Chỉ card.
- **Payslip & Payroll Details View (`src/components/PayrollDetailView.tsx`)**: Display the synthetic adjustment in the "Lịch sử Thưởng/Phạt" list.

## Verification & Safety
- **Tests**: Create Vitest unit tests in a new file `tests/unit/hardworking-bonus.test.ts` to test this logic under multiple conditions:
  - When the Top 1 employee has $< 130$ hours (no bonus).
  - When the Top 1 employee has $\ge 130$ hours (gets 200k).
  - When there is a tie $\ge 130$ hours (both get 200k).
  - When the employee is Full-Time (no bonus).
