---
id: RS-001
type: research
status: approved
project: Checkin App
created: 2026-05-29
---

# Research & Analysis: Carrying Goods Leaderboard ("Top Bưng Hàng Lên Lầu")


## Context & Objectives
LimArt's warehouse is located on the second floor. After checking goods, employees must carry them upstairs. This is a physically demanding task. To encourage and reward employees who frequently help with this, we are creating a new "Top Bưng Hàng Lên Lầu" (Carrying Goods upstairs leaderboard) feature.

## Gamification & Motivation Insights
Based on research for modern gamification and warehouse management UI:
1. **Direct and Easy Submission**: The submission process must be frictionless. Physical workers shouldn't have to fill out complex forms or upload evidence links. A "Direct Submit" flow (similar to packing/points) is critical.
2. **Visual Prestige**: A dedicated leaderboard with distinct themes (e.g., vibrant orange-to-amber colors, representing active movement/climbing) makes achievements feel prestigious.
3. **Double Rewards**: 
   - **Per-Task Reward**: Workers receive a small commission per trip (e.g., 5,000 VND / trip) as a `PayrollAdjustment` directly, or can be set to 0.
   - **Leaderboard Prize**: The Top 1 worker gets an additional monthly cash reward (e.g., +100,000 VND), similar to the "Vua Đóng Hàng" bonus.
4. **Transparency & Reliability**: Points/trips must be validated by administrators in the existing Task Review system.

## Proposed System Architecture

### 1. Database & Task Definition
- A new task definition will be created in the database:
  - **Name**: `Bưng hàng lên lầu`
  - **Unit**: `lượt` (trips)
  - **Base Reward**: `5,000` VND (customizable by Admin)
  - **Active**: `true`
- Since its unit is `lượt`, we will treat it as a **Direct Submit** task:
  - Bypasses WFH location constraints (can be done anytime).
  - Bypasses evidence link requirement.
  - Can be approved by Admin in `/admin/tasks`.

### 2. Leaderboard Calculation (Monthly)
- Fetch all approved `UserTask` records with task definition unit `lượt` within the target month.
- Aggregate counts per employee.
- Rank from highest to lowest.
- Display Top 3 in reports and rewards boards.

### 3. Automated Month-end Bonus (Cron Job)
- Create a cron job `/api/cron/carrying-bonus` (or embed it in the main page trigger, similar to `runPackingBonus`).
- The Top 1 employee receives a `PayrollAdjustment` of `100,000` VND.
- Identical idempotency protection using a unique reason key like `Thưởng Vua Bưng Lầu (Top 1 T{Month}/{Year})`.

### 4. UI/UX Pages & Navigation
- **Home Page (`/`)**: Add a new button "🛗 Ghi nhận Bưng Lầu" linking to `/carrying`.
- **Carrying Page (`/carrying`)**: A dedicated page for declaring carrying tasks (similar to `/packing` but filtered for unit `lượt`).
- **Rewards Page (`/rewards`)**: Add a new leaderboard card "🛗 Vua Bưng Lầu" showing the Top 3 employees.
- **Admin Reports Page (`/admin/reports`)**: Add "🛗 Vua Bưng Lầu" card in the report views.
