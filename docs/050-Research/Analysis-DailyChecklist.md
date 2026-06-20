# Nghiên cứu & Thiết kế Hệ thống Checklist Công việc Hàng ngày (Daily Checklist System)

> [!NOTE]
> Tài liệu này tổng hợp phân tích kỹ thuật và thiết kế hệ thống cho tính năng checklist công việc lặp lại hàng ngày (recurring daily checklists) dành cho nhân sự, tích hợp với hệ thống chấm công và tính lương.

## 1. Đặt vấn đề & Nhu cầu nghiệp vụ
Hệ thống cũ yêu cầu tạo `StaffTask` (Công việc khoán/KPI) thủ công mỗi ngày. Việc này gây lãng phí thời gian khi có những công việc mang tính lặp đi lặp lại (ví dụ: mở cửa, dọn dẹp, kiểm kho, báo cáo cuối ca). 
**Giải pháp:**
- Thiết lập danh sách công việc mẫu (Checklist Templates) lặp lại hàng ngày cho từng nhân sự.
- Mỗi ngày khi nhân viên check-in, hệ thống tự hiển thị danh sách nhiệm vụ của ngày hôm đó.
- Nhân viên bắt buộc tích chọn (✓) tất cả các nhiệm vụ.
- Nếu ngày đó nhân viên đi làm (có Check-in hoặc WFH) mà không tích chọn đầy đủ tất cả nhiệm vụ, ngày làm việc đó sẽ bị đánh dấu là **"Thiếu sót trong quy trình làm việc"** (Deficiency).

---

## 2. Thiết kế Cơ sở dữ liệu (PostgreSQL via Prisma ORM)
Để lưu trữ hiệu quả và tránh phình to dữ liệu (data bloating), chúng ta tách biệt thành hai bảng:
1. **`DailyChecklistTask`**: Định nghĩa nhiệm vụ lặp lại (Template).
2. **`DailyChecklistCompletion`**: Ghi nhận trạng thái hoàn thành của từng nhiệm vụ theo từng ngày cụ thể (`date` định dạng `YYYY-MM-DD`).

### Prisma Schema đề xuất:
```prisma
model DailyChecklistTask {
  id          String   @id @default(cuid())
  title       String
  description String?
  assigneeId  String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assignee    User     @relation(fields: [assigneeId], references: [id], onDelete: Cascade)
  completions DailyChecklistCompletion[]
}

model DailyChecklistCompletion {
  id          String             @id @default(cuid())
  taskId      String
  date        String             // format: YYYY-MM-DD
  completed   Boolean            @default(false)
  completedAt DateTime?
  updatedAt   DateTime           @updatedAt

  task        DailyChecklistTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([taskId, date])
}
```

---

## 3. Cơ chế Khởi tạo & Kiểm tra (Dynamic Checklist Verification)
Thay vì dùng cronjob tạo trước hàng ngàn bản ghi trống mỗi đêm (tốn tài nguyên), chúng ta dùng cơ chế **On-Demand / Dynamic Fetching**:

1. **Khi hiển thị checklist cho nhân viên:**
   - Lấy danh sách `DailyChecklistTask` đang hoạt động (`active: true`) của nhân viên đó.
   - Truy vấn `DailyChecklistCompletion` của ngày được chọn (`date: YYYY-MM-DD`).
   - Ghép cặp (Join) ở mức ứng dụng. Những nhiệm vụ chưa có bản ghi completion sẽ được hiển thị ở trạng thái chưa hoàn thành (`completed: false`).
   - Khi nhân viên tích chọn, chúng ta gọi một server action thực hiện `upsert` vào bảng `DailyChecklistCompletion` cho ngày hôm đó.

2. **Khi tính toán hiệu suất ngày làm việc (Payroll/Stats):**
   - Định nghĩa một ngày có check-in hợp lệ là ngày có giờ làm hoặc được duyệt WFH.
   - Đối với mỗi ngày làm việc này, lấy danh sách `DailyChecklistTask` được tạo trước hoặc trong ngày đó (`createdAt <= endOfDay`).
   - Đếm xem có bao nhiêu nhiệm vụ chưa được đánh dấu là `completed: true`.
   - Nếu tồn tại bất kỳ nhiệm vụ nào chưa hoàn thành, ngày làm việc đó sẽ nhận cờ `isChecklistIncomplete = true` (Thiếu sót quy trình).

---

## 4. Giao diện Người dùng (UI/UX)
Thiết kế giao diện hiện đại sử dụng **Vanilla CSS + Tailwind CSS**, nâng cao trải nghiệm bằng các micro-animations:

### A. Phía Nhân viên (`/staff-tasks`):
- Thêm tab **"Checklist Hàng Ngày"** bên cạnh tab "Công việc KPI/Dự án".
- Cho phép xem checklist của **Hôm nay** và chuyển đổi nhanh giữa các ngày trong tuần/tháng gần đây.
- Hiển thị thanh tiến độ trực quan (Progress Bar) cùng hiệu ứng pháo hoa nhẹ khi tích đủ 100%.
- Cảnh báo trực quan nếu ngày hôm qua hoặc ngày hôm nay còn thiếu sót nhiệm vụ.

### B. Phía Admin (`/staff-tasks` - chế độ Admin):
- Quản lý danh sách checklist lặp lại cho từng nhân sự (Thêm/Sửa/Xóa/Bật-Tắt các nhiệm vụ).
- Xem nhật ký hoàn thành checklist của nhân viên theo từng ngày.

### C. Chi tiết Bảng lương (`/admin/payroll/[userId]` & `/payroll`):
- Trong bảng chi tiết chấm công từng ngày (`dailyDetails`), hiển thị nhãn cảnh báo màu đỏ/cam: `⚠️ Thiếu sót quy trình` nếu ngày làm việc đó không tích đủ checklist.
- Tổng hợp số ngày thiếu sót quy trình trong tháng hiển thị ngay ở thẻ tóm tắt (Summary Card) để Admin dễ dàng theo dõi và điều chỉnh lương/thưởng thủ công nếu cần.
