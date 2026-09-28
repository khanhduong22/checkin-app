# Nghiên cứu & Phân tích: Giao việc theo ca làm & Hiển thị Popup nhiệm vụ khi Check-in

> **Tài liệu phân tích kiến trúc, UX/UI và giải pháp kỹ thuật theo chuẩn 2026**  
> Ngày thực hiện: 28/09/2026  
> Trạng thái: Đã hoàn thiện nghiên cứu & thiết kế giải pháp  

---

## 1. Bối cảnh & Yêu cầu bài toán

Khi số lượng nhân viên tăng lên và khối lượng công việc cửa hàng ngày càng nhiều, việc quản lý và phân công công việc cần được số hóa trực tiếp trên ứng dụng:
1. **Admin có thể giao việc cho từng nhân viên**: Linh hoạt chọn nhân viên và giao các đầu việc cụ thể.
2. **Gán việc theo ngày dựa vào lịch làm của nhân viên**: Nhiệm vụ được gắn liền với ngày/ca làm việc thực tế của nhân viên.
3. **Tùy biến tiêu đề & mô tả chi tiết**: Tên công việc có thể nhập/chỉnh sửa tùy ý Admin, bên dưới có phần mô tả chi tiết nhiệm vụ (hướng dẫn thực hiện, lưu ý, yêu cầu chất lượng).
4. **Nút xóa nhiệm vụ**: Admin có quyền xóa nhiệm vụ đã giao nếu lỡ giao nhầm.
5. **ĐẶC BIỆT - Hiển thị popup nhiệm vụ ngay sau khi bấm Check-in**:
   - Khi nhân viên bấm "📍 Check-in" thành công trên app, một popup/modal trực quan ngay lập tức xuất hiện.
   - Tiêu đề thông báo rõ ràng: *"Nhiệm vụ của bạn hôm nay là..."*
   - Một nhân viên trong 1 ca có thể có nhiều nhiệm vụ khác nhau (danh sách đa nhiệm vụ).
   - Hiển thị đầy đủ Tên nhiệm vụ, Mô tả chi tiết, Trạng thái.

---

## 2. Kết quả Nghiên cứu & Thực tiễn tốt nhất (Best Practices 2026)

Dựa trên phân tích các nền tảng quản trị ca hàng đầu (Deputy, 7shifts, Sling) và xu hướng UX 2026 cho nhân viên làm ca (Shift Workers):

### 2.1. Trải nghiệm Check-in Modal (Instant Post-Checkin Popup)
- **Mô hình "Get In, Get Out" & "Contextual Awareness"**: Nhân viên vào ca thường bận rộn, thao tác nhanh trên điện thoại. Popup cần hiển thị tức thì, sắc nét, chia các nhiệm vụ thành danh sách thẻ gọn gàng.
- **Phân cấp thông tin (Information Hierarchy)**:
  - Header: Lời chúc & thông báo vào ca thành công + tổng số việc cần làm hôm nay.
  - Body: Danh sách nhiệm vụ dạng số thứ tự (1, 2, 3...) với tiêu đề in đậm, mô tả chi tiết hiển thị bên dưới với font chữ rõ ràng, dễ đọc.
  - Badge trạng thái: Phân biệt rõ giữa việc "Chưa làm" (TODO), "Đang làm" (DOING), "Đã hoàn thành" (DONE).
  - Nút đóng / Xác nhận: "Tôi đã hiểu / Bắt đầu ca làm", cùng nút xem chi tiết nếu muốn cập nhật tiến độ.
- **Persistent Access**: Sau khi tắt popup, nhân viên vẫn có thể mở lại danh sách nhiệm vụ hôm nay bất cứ lúc nào thông qua widget trên trang chủ để không bị quên việc trong ca.

### 2.2. Gán việc theo ngày & lịch làm (Shift-Context Task Assignment)
- **Tích hợp hai chiều (Dual-point Assignment)**:
  - **Điểm 1 - Tại Lịch làm việc (`/admin/schedule`)**: Khi Admin xem lịch làm việc của nhân viên trên Calendar, click vào ca làm của nhân viên sẽ thấy ngay danh sách nhiệm vụ ca đó và có nút "+ Giao việc ca này".
  - **Điểm 2 - Tại Bảng công việc (`/staff-tasks`)**: Admin chọn nhân viên, hệ thống tự động gợi ý các ca làm sắp tới của nhân viên đó trong tuần để Admin 1-click chọn đúng ngày làm việc, tránh tình trạng giao việc vào ngày nhân viên nghỉ.

### 2.3. Quản lý & Xóa nhiệm vụ (Safety & Error Recovery)
- Admin có thể xóa nhiệm vụ bất cứ lúc nào với hộp thoại xác nhận ("Bạn có chắc chắn muốn xóa nhiệm vụ này không?").
- Dữ liệu được xóa sạch hoặc cập nhật ngay lập tức (Optimistic UI + Server Action revalidate).

---

## 3. Kiến trúc Dữ liệu & Kỹ thuật

### 3.1. Mô hình `StaffTask` hiện tại & tích hợp
Mô hình `StaffTask` trong `prisma/schema.prisma` đã có sẵn các trường cần thiết:
- `title`: Chuỗi ký tự (Tiêu đề tùy biến).
- `description`: Text (Mô tả chi tiết công việc).
- `status`: "TODO" | "DOING" | "DONE" | "APPROVED" | "REJECTED".
- `assigneeId`: ID nhân viên được giao.
- `startDate`: Ngày bắt đầu / ngày ca làm.
- `deadline`: Hạn chót (mặc định cuối ngày hoặc cuối ca).
- `createdById`: Admin giao việc.

### 3.2. Truy vấn nhiệm vụ ngày hôm nay (Vietnam Timezone UTC+07:00)
- Ca làm và ngày check-in tính theo múi giờ Việt Nam (+07:00).
- Khi nhân viên check-in, Server Action `performCheckIn` thực hiện:
  1. Ghi nhận `CheckIn`.
  2. Truy vấn tất cả `StaffTask` của `assigneeId` có `startDate` nằm trong ngày hôm nay (từ 00:00:00 đến 23:59:59 VN time) hoặc được giao hôm nay.
  3. Trả về mảng `todayTasks` trực tiếp trong response của `performCheckIn`.
  4. Client `CheckInButtons.tsx` nhận danh sách `todayTasks` và lập tức mở `TaskPopupDialog`.

### 3.3. Quyền truy cập (Access Control)
- Trước đây hệ thống có cờ `staffTasksAllowed` giới hạn chỉ một số nhân viên mới được xem/giao việc.
- Với yêu cầu mới số lượng nhân viên tăng và giao việc toàn diện, Admin có thể giao việc cho **bất kỳ nhân viên nào** đang hoạt động (`isActive: true`).
- Bất kỳ nhân viên nào có việc được giao hôm nay đều được xem popup và truy cập chi tiết công việc của mình.

---

## 4. Kế hoạch triển khai

1. **Backend**:
   - Cập nhật `performCheckIn` trong `src/app/actions.ts`: truy vấn và trả về danh sách `todayTasks` của nhân viên ngay khi check-in thành công.
   - Thêm Server Action `getTodayTasks(userId)` để nhân viên có thể xem lại nhiệm vụ hôm nay bất cứ lúc nào từ trang chủ.
   - Cập nhật `createStaffTask`, `updateStaffTask`, `deleteStaffTask` trong `src/actions/staff-task-actions.ts` hỗ trợ gán theo ca/ngày và xóa nhiệm vụ an toàn.
   - Thêm Server Action lấy lịch làm việc của nhân viên để gợi ý ngày làm khi giao việc.

2. **Frontend UI**:
   - Xây dựng component `TodayTaskCheckInDialog.tsx` với giao diện chuyên nghiệp, trực quan, hỗ trợ hiển thị nhiều nhiệm vụ với tiêu đề, mô tả chi tiết, trạng thái.
   - Tích hợp `TodayTaskCheckInDialog` vào `CheckInButtons.tsx`: tự động bật lên khi bấm Check-in thành công.
   - Thêm widget / nút "📋 Nhiệm vụ ca hôm nay" trên trang chủ để nhân viên có thể xem lại bất kỳ lúc nào trong ca.
   - Nâng cấp `AdminStaffTaskClient.tsx`:
     - Cho phép chọn tất cả nhân viên đang hoạt động.
     - Hiển thị lịch làm việc / ca làm của nhân viên được chọn để Admin chọn ngày chuẩn xác.
     - Nút xóa nhiệm vụ nổi bật, kèm modal xác nhận.
     - Chỉnh sửa linh hoạt tiêu đề và mô tả chi tiết.
   - Nâng cấp `ScheduleCalendar.tsx`: khi Admin click vào ca làm của nhân viên trên lịch, hiển thị các nhiệm vụ ca đó và có nút giao việc / xóa việc trực tiếp.

3. **Kiểm thử & Tối ưu hóa**:
   - Viết Unit Test cho việc lấy nhiệm vụ khi check-in và xóa nhiệm vụ.
   - Chạy toàn bộ test suite để đảm bảo không hồi quy.
   - Tối ưu hóa truy vấn song song và múi giờ.
