---
id: Epic-Attendance
type: epic
status: active
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[PRD-CheckinApp]]
---

# Epic: Attendance Tracking

## Summary
The core feature of the application, ensuring employees are physically present at the office (or approved locations) when logging work hours. It prevents time theft via IP restriction.

## Features / User Stories

### 1. Daily Check-In
- **As a User**, I want to check in when I arrive at the office so my hours are tracked.
- **System**: Must validate User IP against `AllowedIP` table.
- **System**: Must auto-record timestamp.

### 2. Daily Check-Out
- **As a User**, I want to check out when I leave.
- **System**: Calculate hours worked for the day.

### 3. IP Management
- **As an Admin**, I want to whitelist office IP addresses.
- **As an Admin**, I want to label IPs (e.g., "Main Office", "Branch 2").

### 4. Reporting
- **As an Admin**, I want to see a daily report of who is present, late, or absent.
- **As an Admin**, I want to export monthly attendance for payroll.
