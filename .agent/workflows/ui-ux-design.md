---
description: UI/UX design workflow - building accessible, responsive frontend components
---

# UI/UX Design Workflow

## Steps

1. **Component Design Principles**:
   - Mobile-first responsive layout (Tailwind CSS).
   - Touch-friendly hit targets (minimum 44x44px).
   - Clear loading and error states for all asynchronous actions.
2. **Implementation**:
   - Build accessible components in `apps/admin-spa` or `apps/staff-pwa`.
   - Ensure color contrast and readability meet WCAG standards.
3. **Verification**:
   - Verify layout responsiveness across mobile and desktop viewports.
   - Run E2E tests: `npm run test:e2e`.
