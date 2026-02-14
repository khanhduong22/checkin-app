---
id: PRD-CheckinApp
type: prd
status: draft
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[Requirements-MOC]]
---

# Product Requirements Document (Reverse Engineered)

## 1. Introduction

The **Checkin App** is an internal web application designed to manage employee attendance, simplify HR requests, and gamify the work environment. It serves as the central hub for daily operations, including check-ins, task management, and payroll tracking.

## 2. Key Objectives
1.  **Attendance Accuracy**: Prevent attendance fraud using IP geofencing.
2.  **Operational Efficiency**: Automate shift management and variable salary calculations.
3.  **Employee Engagement**: Increase morale through gamification (Lucky Wheel, Shop Pet).
4.  **Process Streamlining**: digitalize distinct workflows for Leave, Late data, and WFH requests.

## 3. Core Features (Epics)

### [[Epic-Attendance]]
- **IP-Based Check-in/out**: Users can only check in if their IP matches whitelisted office IPs.
- **Validations**: Prevents double check-ins or checking out without checking in.
- **Reporting**: Admins can view daily/monthly attendance logs.

### [[Epic-Task-Marketplace]]
- **Task Posting**: Admins create "Task Items" based on templates ("Task Definitions").
- **Claiming**: Users browse and claim "Open" tasks.
- **Submission**: Users submit evidence (links) and quantity.
- **Review**: Admins approve/reject submissions, which triggers payments (Payroll Adjustment).

### [[Epic-Gamification]]
- **Lucky Wheel**: Users earn spins (daily limit + check-in requirement). Prizes include physical items or cash.
- **Shop Pet**: A virtual pet that levels up based on user activity (likely check-ins/tasks).
- **Achievements**: Badges for milestones (e.g., "7 Day Streak").

### [[Epic-Requests]]
- **Leave/Late/WFH**: Users submit requests with reasons and dates.
- **Approval Workflow**: Admins review and approve/reject requests.

### [[Epic-Payroll]]
- **Calculations**: Automatically computes total income = (Fixed Salary) + (Hourly Rate * Shift Hours) + (Task Rewards) + (Adjustments).
- **Visibility**: Users can view their estimated salary for the current month.

### [[Epic-Admin-Dashboard]]
- **User Management**: Create/Edit users, assign roles and employment types.
- **Configuration**: Manage Work Shifts, Holidays, and Allowed IPs.

## 4. User Roles

| Role | Permissions |
| :--- | :--- |
| **USER** | Check-in/out, View own dashboard/payroll, Claim tasks, Play Lucky Wheel, Submit requests. |
| **ADMIN** | All USER permissions + Manage Users, Shifts, Tasks, Payroll, Settings, Approvals. |

## 5. Non-Functional Requirements
- **Performance**: Check-in must be instant (< 1s).
- **Security**: OAuth for login, IP validation for attendance.
- **Reliability**: Zero data loss on attendance records.
