# Project Status: Maintenance & Minor Fixes

> Dự án đã hoàn thành các tính năng chính. Giai đoạn hiện tại tập trung vào bảo trì, sửa lỗi nhỏ, và cải thiện trải nghiệm.

## Completed Features ✅
- **Check-in/Check-out**: IP-based geofencing, shift-aware
- **Admin Dashboard**: Overview, real-time stats, financial forecasting
- **Payroll**: Role-based salary, audit trails, timezone normalization
- **Employee Management**: CRUD, role assignment
- **Schedule/Shifts**: Calendar scheduling, shift configuration
- **Task Management**: Admin task assignment & tracking
- **Lucky Wheel (Gacha)**: Gamification with role-based access
- **Request Management**: Leave/absence requests
- **Reports**: Attendance & payroll reports
- **Announcements & Changelog**: Internal comms
- **Settings**: Holiday config, system settings
- **Login/Auth**: Supabase-based authentication

## Known Issues to Fix 🔧
- [ ] `src/lib/stats.ts`: Import lỗi — `isLate` / `checkIsLate` và `GRACE_PERIOD_MINUTES` không tồn tại trong `@/lib/utils`. Cần kiểm tra và export lại đúng hàm.
- [ ] `src/app/admin/help/page.tsx`: Module not found `ai/react` (hoặc `@ai-sdk/react`) và `@/components/ui/scroll-area`. Tính năng RAG Help Center chưa hoàn thiện — cần cài đúng thư viện hoặc tạm disable trang này.

## Next Steps 🚀
1. **Upgrade Next.js lên 16.1** (từ 14.1.0) — bao gồm React 19, async API changes, config migration
2. Fix các lỗi build/runtime ở Known Issues để `yarn dev` chạy sạch
3. Code cleanup & remove unused imports/files
4. Cải thiện UX nhỏ khi có feedback

## Notes
- **Tech Stack**: Next.js 14.1.0, React 18, Supabase, Vercel
- **Dev server**: `yarn dev` (port 5000)
- **Alias**: `fedev` = `yarn dev`
