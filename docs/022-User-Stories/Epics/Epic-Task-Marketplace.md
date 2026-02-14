---
id: Epic-Task-Marketplace
type: epic
status: active
project: Checkin App
created: 2026-02-12
updated: 2026-02-12
linked-to: [[PRD-CheckinApp]]
---

# Epic: Task Marketplace

## Summary
A system allowing Administrators to post internal "gig" tasks that employees can claim, complete, and get paid for. This incentivizes extra work and organizes ad-hoc duties.

## Features / User Stories

### 1. Task Definitions (Templates)
- **As an Admin**, I want to define reusable task templates (e.g., "Write Blog Post", "Clean Kitchen") with a base reward unit so I don't have to re-enter details every time.

### 2. Posting Tasks
- **As an Admin**, I want to post specific "Task Items" from templates, adding specific titles, descriptions, and deadlines.
- **As an Admin**, I want to see a list of all Posted tasks and their status.

### 3. Claiming Tasks
- **As a User**, I want to browse "Open" tasks in the marketplace.
- **As a User**, I want to claim a task so that no one else can take it while I work on it.
- **Constraint**: A task can only be claimed by one user at a time.

### 4. Submission
- **As a User**, I want to submit my work (Evidence Link, Note) when finished.
- **As a User**, I want to specify the quantity if the task allows multiples (though usually 1 per item).

### 5. Review & Payment
- **As an Admin**, I want to review submitted tasks.
- **As an Admin**, I want to Approve (with optional bonus/penalty) or Reject the submission.
- **As System**, Approval should automatically create a `PayrollAdjustment` for the user.
