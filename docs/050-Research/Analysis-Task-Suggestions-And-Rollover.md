---
id: RES-008
type: research
status: approved
project: checkin-app
owner: "@team"
tags: [staff-tasks, kpi, autocomplete, templates, rollover]
linked-to: [[Research-MOC]]
created: 2026-09-05
updated: 2026-09-05
---

# Analysis: Staff Task Rollover Removal & Smart Task Autocomplete System

## 1. Problem Statement & User Context
- **Previous Behavior**: Approving specific recurring tasks (such as "làm video", "live stream 2 buổi", "đăng story", "đăng bài fb, ins, thread") automatically generated duplicate tasks for the subsequent week.
- **Identified Issues**:
  1. Auto-duplicating tasks created unwanted task clutter if a task was only meant for a one-off run or if assignment schedules needed manual adjustments.
  2. Managers had to re-type full task descriptions and titles repeatedly when delegating new assignments.
- **Desired Solution**:
  1. Remove the automatic rollover/duplication logic completely upon task approval.
  2. Implement an intelligent, instantaneous autocomplete and task template suggestion mechanism when creating/editing tasks (e.g. typing "đăng bài", "live", "tạo", "đăng kí").
  3. When an option is selected from suggestions, both the **Title** and the **Detailed Description** are populated automatically.
  4. Ensure previous task titles and descriptions are aggregated dynamically, combined with default task presets for immediate usability.

## 2. Technical Research & Best Practices

### A. Vietnamese Diacritics Normalization & Fuzzy Search
- Standard string matching fails when users type without accents (e.g., "dang bai" vs "đăng bài", "dang ki" vs "đăng kí", "tao video" vs "tạo video").
- **Solution**: Unicode Normalization Form Decomposition (`NFD`) + strip combining diacritical marks `[\u0300-\u036f]` + handle special Vietnamese character `đ`/`Đ` mapping to `d`/`D`.
- Helper function `normalizeVietnamese(str)` converts inputs into plain lowercase ASCII tokens for fast sub-string matching.

### B. Keyboard Accessible & Popover Autocomplete Pattern
- Implement an intuitive dropdown popover anchored to the Title input field.
- Support mouse clicks as well as keyboard navigation (Arrow Down, Arrow Up, Enter to select, Escape to dismiss).
- Provide quick suggestion tags / preset chips for common store tasks so users can click with 1 tap even before typing.

### C. Aggregation of Task History & Standard Presets
- Collect unique `(title, description)` from current/past tasks.
- Include predefined standard shop templates:
  - **Đăng bài FB, Ins, Threads**: Title + standard posting guidelines.
  - **Live stream 2 buổi**: Title + livestream schedule & expectations.
  - **Làm video TikTok / Reels**: Title + video duration, formats, hashtags.
  - **Đăng story hằng ngày**: Title + story update requirements.
  - **Đăng kí chương trình khuyến mãi**: Title + promotional voucher setup requirements.

## 3. Implementation Roadmap
1. Update `src/actions/staff-task-actions.ts` to remove the approval auto-duplicate block.
2. Add `normalizeVietnamese` helper in `src/lib/utils.ts` and ensure 100% unit test coverage in `tests/unit/utils.test.ts`.
3. Enhance `AdminStaffTaskClient.tsx` modal to include the autocomplete dropdown & quick template selector for Title and Description.
4. Update unit tests in `tests/unit/staff-task.test.ts` to verify auto-duplication is disabled and task creation/updates work seamlessly.
5. Update project documentation (`docs/030-Specs/Architecture/`, `DB-Schema.md`, `QA-MOC.md`, `Roadmap.md`).
