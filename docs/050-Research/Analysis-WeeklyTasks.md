# Nghiên cứu và Thiết kế Tính năng Weekly Task cho Quản lý

Tài liệu này tổng hợp phân tích, thiết kế kỹ thuật và kế hoạch triển khai cho tính năng chia danh sách công việc quản lý thành Daily Tasks (hằng ngày) và Weekly Tasks (hằng tuần), kèm theo cơ chế chặn Check-out vào ngày làm việc cuối tuần nếu chưa hoàn thành các việc tuần hoặc chưa báo cáo giải trình.

---

## 1. Yêu cầu Nghiệp vụ (Business Requirements)

- **Phân chia Task:**
  - **Daily Tasks:** Vẫn như cũ (lặp lại mỗi ngày theo mẫu có sẵn).
  - **Weekly Tasks:** Công việc tuần được Admin (hoặc người được phân quyền) tạo thủ công trực tiếp cho từng tuần cụ thể.
- **Ràng buộc Check-out:**
  - Vào **ngày làm việc cuối cùng trong tuần** của nhân sự quản lý, hệ thống sẽ kiểm tra xem các công việc hằng tuần của tuần đó đã được hoàn thành hay chưa.
  - Nếu **chưa hoàn thành**, hệ thống sẽ **chặn không cho phép Check-out**.
- **Cơ chế Giải trình & Chuyển tuần (Carry Over):**
  - Nếu không thể hoàn thành trong tuần đó, quản lý phải gửi báo cáo giải trình cho **Admin Dung** giải thích lý do chưa hoàn thành.
  - Sau khi nộp báo cáo giải trình, hệ thống sẽ cho phép Check-out và **tự động chuyển công việc chưa hoàn thành đó sang tuần tiếp theo**.

---

## 2. Thiết kế Kỹ thuật (Technical Design)

### 2.1 Cấu trúc Cơ sở Dữ liệu (Prisma Model)

Thêm model `ManagerWeeklyTask` trong `prisma/schema.prisma` để quản lý các công việc hằng tuần:

```prisma
model ManagerWeeklyTask {
  id            String    @id @default(cuid())
  title         String
  description   String?
  assigneeId    String
  weekStart     DateTime  // Ngày Thứ Hai của tuần đó (UTC, biểu diễn 00:00:00 ICT)
  weekEnd       DateTime  // Ngày Chủ Nhật của tuần đó (UTC, biểu diễn 23:59:59.999 ICT)
  completed     Boolean   @default(false)
  completedAt   DateTime?
  explanation   String?   // Báo cáo giải trình vì sao chưa hoàn thành
  isCarriedOver Boolean   @default(false) // Đánh dấu việc chuyển tiếp từ tuần trước
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  assignee      User      @relation("ManagerWeeklyAssignee", fields: [assigneeId], references: [id], onDelete: Cascade)

  @@index([assigneeId, weekStart])
}
```

Thêm quan hệ tương ứng trong model `User`:

```prisma
model User {
  // ...
  managerWeeklyTasks ManagerWeeklyTask[] @relation("ManagerWeeklyAssignee")
}
```

### 2.2 Thuật toán Xác định Tuần & Ngày làm việc cuối cùng (Date Logic)

- **Xác định ranh giới tuần (Monday 00:00:00 đến Sunday 23:59:59.999 ICT):**
  Sử dụng múi giờ Việt Nam (UTC+7) bằng cách điều chỉnh lệch 7 tiếng (`VN_OFFSET_MS = 7 * 60 * 60 * 1000`).
- **Kiểm tra ngày làm việc cuối cùng trong tuần:**
  - Truy vấn toàn bộ lịch làm việc (`WorkShift`) có trạng thái `APPROVED` của nhân sự trong tuần hiện tại.
  - Tìm ca làm việc có ngày bắt đầu muộn nhất.
  - So sánh ngày bắt đầu của ca đó với ngày hiện tại (theo giờ Việt Nam). Nếu bằng hoặc muộn hơn ngày hiện tại không có ca nào khác ở các ngày tiếp theo trong tuần, ngày hôm nay là ngày làm việc cuối cùng của tuần đó.

### 2.3 Cơ chế Chặn Check-out & Giải trình

Trong hàm `performCheckIn` khi thực hiện `checkout`:
1. Kiểm tra Daily checklist hoàn thành thông qua `verifyChecklistComplete` (giữ nguyên).
2. Kiểm tra nếu ngày hôm nay là ngày làm việc cuối cùng của tuần hiện tại:
   - Truy vấn các `ManagerWeeklyTask` của tuần này.
   - Lọc ra các công việc chưa hoàn chỉnh (`completed === false`) và chưa có giải trình (`explanation === null` hoặc rỗng).
   - Nếu tồn tại công việc chưa hoàn thành mà chưa giải trình: **Trả về thông báo lỗi ngăn Check-out**.
   - Nếu đã nộp giải trình (hoặc hoàn thành hết), cho phép Check-out.

---

## 3. Thiết kế Giao diện (UI/UX Design)

### 3.1 Bảng điều khiển Quản lý (`/admin/manager-tasks`)
- Dưới tab **Checklist**, chia thành 2 phần rõ rệt:
  - **Checklist Hằng Ngày:** List các công việc template hằng ngày (như cũ).
  - **Checklist Hằng Tuần:** Danh sách công việc của tuần tương ứng với ngày được chọn.
- Cho phép Admin thêm trực tiếp Weekly Task bằng cách điền Title, Description và bấm Lưu. Task mới được gán tự động cho tuần chứa ngày đang chọn.
- Mỗi Weekly Task có nút:
  - Hoàn thành (checkbox).
  - Xóa / Sửa.
  - Báo cáo giải trình & Chuyển tuần (nếu chưa hoàn thành).

### 3.2 Modal Báo cáo Giải trình & Chuyển tuần
- Khi người dùng bấm giải trình một công việc tuần chưa hoàn thành:
  - Hiển thị Modal yêu cầu nhập lý do chưa hoàn thành.
  - Khi lưu:
    1. Cập nhật trường `explanation` của task hiện tại.
    2. Tự động tạo một Weekly Task mới cho tuần sau (cộng 7 ngày vào `weekStart`, `weekEnd`) với trạng thái `completed: false` và `isCarriedOver: true`.
    3. Tạo một `Request` hệ thống với loại `WEEKLY_TASK` để gửi lên cho Admin Dung duyệt báo cáo.

---

## 4. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

- **Unit Test:** Viết các bài test trong `tests/unit/manager-weekly.test.ts` để kiểm tra:
  - Thuật toán xác định ngày làm việc cuối tuần.
  - Quy trình chặn checkout khi thiếu việc tuần.
  - Quy trình tự động chuyển tiếp (carry over) việc tuần khi giải trình.
- **Manual Test:** Thử nghiệm tạo việc tuần, tích hoàn thành, giải trình và thực hiện Check-out trên môi trường local.
