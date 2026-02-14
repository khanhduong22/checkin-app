---
id: Admin-Guide
type: manual
status: draft
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[Manuals-MOC]]
---

# Administrator Guide

## 1. Getting Started

### Accessing the Admin Panel
1.  Log in with your Google Account.
2.  If you have `ADMIN` role, click the "Admin Dashboard" link in the sidebar.
3.  (First time setup): Provide your Google Email to the system owner to be manually promoted in the database.

## 2. Managing Users

### Promote a User to Admin
- Go to **Users -> Manage**.
- Find the user.
- Change Role from `USER` to `ADMIN`.

### Adjust Employment Type
- **Full Time**: Default. Gets `monthlySalary`.
- **Part Time**: Gets `hourlyRate`. Ensure you set the correct rate (`hourlyRate`) for calculation.

## 3. Configuring Attendance
- Go to **Settings -> Allowed IPs**.
- Add the public IP of the office Wi-Fi.
- **Tip**: You can find your current IP by Googling "What is my IP".

## 4. Managing Tasks
- **Create Template**: Go to **Tasks -> Definitions**. Create reusable tasks (e.g., "Clean Office").
- **Post Task**: Go to **Tasks -> Marketplace**. Select a template, add details, and "Post".
- **Review**: Go to **Tasks -> Pending Reviews**. Approve valid submissions to pay the user.

## 5. Payroll
- **Run Payroll**: Go to **Payroll**. Select the month.
- **Review**: Check calculated hours and adjustments.
- **Export**: Download as CSV/Excel for payment.
