---
id: Admin-Guide-001
type: manual
status: active
project: Checkin App
owner: "@admin"
created: 2026-02-12
updated: 2026-03-03
linked-to: [[Manuals-MOC]]
---

# Hướng Dẫn Quản Trị — Admin Guide

> Tài liệu này dành riêng cho **Admin** quản lý hệ thống chấm công nội bộ LimArt.

---

## Mục lục

1. [Truy cập Admin Panel](#1-truy-cập-admin-panel)
2. [Admin Dashboard (Tổng quan)](#2-admin-dashboard-tổng-quan)
3. [Quản lý nhân viên](#3-quản-lý-nhân-viên)
4. [Cài đặt chấm công (Allowed IPs)](#4-cài-đặt-chấm-công-allowed-ips)
5. [Quản lý ca làm việc (Schedule)](#5-quản-lý-ca-làm-việc-schedule)
6. [Task Marketplace](#6-task-marketplace)
7. [Quản lý yêu cầu (Requests)](#7-quản-lý-yêu-cầu-requests)
8. [Payroll — Tính lương](#8-payroll--tính-lương)
9. [Báo cáo (Reports)](#9-báo-cáo-reports)
10. [Lucky Wheel — Cấu hình Gacha](#10-lucky-wheel--cấu-hình-gacha)
11. [Thông báo & Changelog](#11-thông-báo--changelog)
12. [Chế độ View As (Xem Dashboard nhân viên)](#12-chế-độ-view-as)
13. [Ngày đặc biệt (Sinh nhật & Kỷ niệm)](#13-ngày-đặc-biệt)

---

## 1. Truy cập Admin Panel

1. Đăng nhập bằng **tài khoản Google có role ADMIN**.
2. Từ Trang chủ, cuộn xuống và nhấn **"🔧 Admin Dashboard"**.
3. Hoặc truy cập thẳng: `/admin`.

### Cấp quyền Admin cho nhân viên mới

> Chỉ làm bước này khi cần thiết. Chỉ những người tin cậy mới được cấp quyền Admin.

1. Vào **Admin → Employees**.
2. Tìm nhân viên cần cấp quyền.
3. Nhấn **Edit**, đổi `Role` từ `USER` → `ADMIN`.
4. Nhấn **Lưu**.

---

## 2. Admin Dashboard (Tổng quan)

Trang `/admin` hiển thị các thống kê real-time:

| Widget | Nội dung |
|---|---|
| **Tổng nhân viên** | Số lượng user trong hệ thống |
| **Check-in hôm nay** | Số người đã check-in trong ngày |
| **Vắng mặt** | Số người chưa check-in / nghỉ |
| **Trễ hôm nay** | Số người đến trễ |
| **Danh sách check-in** | Live feed ai đã check-in/out |

---

## 3. Quản lý nhân viên

**Đường dẫn**: `/admin/employees`

### 3.1 Xem danh sách nhân viên

Hiển thị toàn bộ nhân viên với các thông tin: tên, email, vai trò, loại hợp đồng, mức lương.

### 3.2 Thêm nhân viên mới

> Nhân viên mới tự đăng nhập bằng Google lần đầu tiên sẽ tự động tạo tài khoản với role `USER`.
> Admin chỉ cần vào cập nhật thông tin hợp đồng sau đó.

### 3.3 Chỉnh sửa thông tin nhân viên

1. Nhấn icon **✏️ Edit** bên cạnh tên nhân viên.
2. Cập nhật các trường:

| Trường | Ý nghĩa |
|---|---|
| `name` | Tên hiển thị |
| `role` | `USER` hoặc `ADMIN` |
| `employmentType` | `FULL_TIME` hoặc `PART_TIME` |
| `monthlySalary` | Lương tháng cố định (Full-time) |
| `hourlyRate` | Lương theo giờ (Part-time) |
| `dateOfBirth` | Ngày sinh (cho Special Days) |
| `startDate` | Ngày vào làm (cho Work Anniversary) |

### 3.4 Loại hợp đồng

| Loại | Cách tính lương |
|---|---|
| `FULL_TIME` | Dùng `monthlySalary` làm lương cơ bản |
| `PART_TIME` | `hourlyRate × totalHours` (tính từ giờ check-in/out) |

### 3.5 Xóa nhân viên

> [!CAUTION]
> Xóa nhân viên sẽ xóa TOÀN BỘ lịch sử check-in. Cân nhắc kỹ trước khi thực hiện.

### 3.6 Xem Dashboard của nhân viên (View As)

→ Xem [Mục 12: Chế độ View As](#12-chế-độ-view-as)

---

## 4. Cài đặt chấm công (Allowed IPs)

**Đường dẫn**: `/admin/settings`

Nhân viên chỉ được check-in khi IP của họ khớp với danh sách này.

### Thêm IP văn phòng

1. Vào **Settings → Allowed IPs**.
2. Nhấn **"Thêm IP"**.
3. Nhập địa chỉ IP public của mạng Wi-Fi văn phòng.
4. Nhấn **Lưu**.

> [!TIP]
> Để tìm IP public hiện tại của văn phòng: Google **"What is my IP"** khi đang ở văn phòng, lấy địa chỉ IPv4 hiện ra.

> [!NOTE]
> IP điện thoại dùng data 4G sẽ **không được chấp nhận** (đây là cơ chế chống chấm công hộ).

---

## 5. Quản lý ca làm việc (Schedule)

**Đường dẫn**: `/admin/schedule`

### 5.1 Tạo ca làm việc cho nhân viên

1. Chọn nhân viên từ dropdown.
2. Chọn ngày và giờ bắt đầu / kết thúc ca.
3. Nhấn **"Tạo ca"**.

### 5.2 Mở ca để swap

Nếu nhân viên muốn nhờ người khác làm thay:
- Đánh dấu ca là **"Mở để swap"** (`isOpenForSwap = true`).
- Nhân viên khác sẽ thấy badge **"🎁 N kèo thơm"** trên Trang chủ và có thể đăng ký nhận ca.

### 5.3 Xem lịch tổng

Admin có thể xem lịch làm việc của tất cả nhân viên theo tuần/tháng.

---

## 6. Task Marketplace

**Đường dẫn**: `/admin/tasks`

### 6.1 Tạo Task Template

Template là loại công việc tái sử dụng nhiều lần (VD: "Dọn dẹp xưởng", "Chụp ảnh sản phẩm").

1. **Tasks → Definitions**.
2. Nhấn **"Tạo Template"**.
3. Điền: Tên, Mô tả, Thù lao mặc định.

### 6.2 Đăng Job

1. **Tasks → Marketplace**.
2. Chọn Template.
3. Thêm chi tiết cụ thể cho lần đăng này (deadline, ghi chú).
4. Nhấn **"Đăng Job"** → nhân viên sẽ thấy ngay trên `/tasks`.

### 6.3 Duyệt Job đã hoàn thành

1. **Tasks → Pending Reviews**.
2. Xem bằng chứng mà nhân viên upload.
3. Nhấn **✅ Duyệt** → tiền được cộng vào lương tháng của nhân viên.
4. Nhấn **❌ Từ chối** → gửi feedback để nhân viên làm lại.

---

## 7. Quản lý yêu cầu (Requests)

**Đường dẫn**: `/admin/requests`

Nhân viên có thể gửi 3 loại yêu cầu:

| Loại | Khi nào dùng |
|---|---|
| **Nghỉ phép** | Xin nghỉ ngày hôm đó hoặc tương lai |
| **Đi trễ** | Giải trình lý do đến muộn |
| **WFH** | Xin làm việc tại nhà (không check-in IP) |

### Xử lý yêu cầu

1. Vào `/admin/requests`.
2. Xem danh sách yêu cầu đang **Pending**.
3. Đọc lý do của nhân viên.
4. Nhấn **✅ Phê duyệt** hoặc **❌ Từ chối**.

> [!NOTE]
> Yêu cầu WFH được duyệt **không ảnh hưởng** đến tính lương — ngày đó vẫn được tính là ngày công.

---

## 8. Payroll — Tính lương

**Đường dẫn**: `/admin/payroll`

### 8.1 Xem lương tháng hiện tại

1. Vào `/admin/payroll`.
2. Chọn tháng cần xem.
3. Hệ thống hiển thị bảng lương của tất cả nhân viên:
   - Tổng giờ làm
   - Số ngày công
   - Lương cơ bản
   - Bonus từ Task Marketplace
   - Trừ lương do đi trễ (`latePenaltyAmount`)
   - **Tổng lương**

### 8.2 Quy tắc trừ lương do đi trễ

| Số lần trễ / tháng | Hệ quả |
|---|---|
| 1–3 lần | Cảnh báo, **không trừ lương** |
| 4+ lần | Trừ 1 giờ lương cho **mỗi lần trễ từ lần thứ 4** |

**Ví dụ**: Trễ 6 lần → trừ 3 giờ lương (3 lần × 1 giờ).

### 8.3 Điều chỉnh thủ công

Admin có thể thêm/bớt khoản điều chỉnh đặc biệt:
1. Nhấn **"Thêm điều chỉnh"** bên cạnh nhân viên.
2. Nhập số tiền (+ để thêm, - để trừ) và lý do.
3. Nhấn Lưu.

### 8.4 Export bảng lương

1. Nhấn **"Export CSV"** hoặc **"Export Excel"**.
2. File sẽ tải về với đầy đủ thông tin để chuyển đến phòng kế toán.

---

## 9. Báo cáo (Reports)

**Đường dẫn**: `/admin/reports`

| Báo cáo | Nội dung |
|---|---|
| **Chấm công tháng** | Bảng chi tiết từng ngày của từng nhân viên |
| **Thống kê trễ** | Ai hay đi trễ, bao nhiêu lần |
| **Tổng giờ làm** | So sánh giữa các nhân viên |

---

## 10. Lucky Wheel — Cấu hình Gacha

**Đường dẫn**: `/admin/lucky-wheel`

### Cấu hình phần thưởng

1. Xem danh sách các phần thưởng hiện tại và tỉ lệ trúng.
2. Thêm/Xóa/Chỉnh sửa phần thưởng theo ý muốn.
3. Đảm bảo tổng tỉ lệ = 100%.

### Xem lịch sử quay

- Xem ai đã quay, trúng gì, vào lúc nào.
- Dùng để kiểm tra tính minh bạch của hệ thống.

> [!NOTE]
> Admin **không bị giới hạn số lần quay mỗi ngày**. Nhân viên chỉ được quay 1 lần/ngày và phải check-in trước.

---

## 11. Thông báo & Changelog

### Đăng thông báo nội bộ

**Đường dẫn**: `/admin/announcements`

1. Nhấn **"Tạo thông báo mới"**.
2. Nhập tiêu đề và nội dung.
3. Bật `active = true` → thông báo xuất hiện ngay trên Trang chủ của tất cả nhân viên.
4. Tắt `active` khi muốn ẩn thông báo cũ.

### Changelog

**Đường dẫn**: `/admin/changelog`

Ghi lại các cập nhật, thay đổi hệ thống để nhân viên biết. Admin tạo entry mới sau mỗi lần cập nhật tính năng.

---

## 12. Chế độ View As

Admin có thể **xem Dashboard theo góc nhìn của một nhân viên cụ thể** — hữu ích khi cần hỗ trợ hoặc kiểm tra.

1. Vào **Admin → Employees**.
2. Nhấn icon **"👀 Xem Dashboard"** bên cạnh nhân viên.
3. Hệ thống redirect về Trang chủ nhưng hiển thị dữ liệu của nhân viên đó.
4. Banner tím **"👀 Chế độ xem Dashboard của: [Tên]"** xuất hiện ở đầu trang.
5. Nhấn **"Thoát"** để về lại trang Admin.

---

## 13. Ngày đặc biệt

Xem tài liệu chi tiết: [[Special-Days-Management]]

**Tóm tắt nhanh**:
1. **Admin → Employees** → Nhấn icon **📅** bên cạnh nhân viên.
2. Chọn **Ngày sinh** và **Ngày vào làm**.
3. Nhấn **Lưu thay đổi**.

→ Hệ thống tự động chúc mừng (confetti + widget) khi đến ngày đặc biệt của nhân viên.

---

## ⚠️ Lưu ý quan trọng cho Admin

> [!CAUTION]
> **Không reset database**. Mọi thay đổi cần thực hiện qua giao diện hoặc migration scripts.

> [!WARNING]
> Khi xóa nhân viên: toàn bộ lịch sử chấm công, lương, task của người đó cũng bị xóa theo (CASCADE). Chỉ làm khi nhân viên đã nghỉ hẳn và đã export dữ liệu cần thiết.

> [!IMPORTANT]
> Trước khi deploy cập nhật hệ thống, phải chạy đầy đủ **Pre-Deploy Gate** (xem `.agent/rules/tests.md`):
> 1. `npm run test` ✅
> 2. `npm run build` ✅  
> 3. Xác nhận deploy lần 1
> 4. `npm run test:e2e` ✅
> 5. Xác nhận deploy lần 2
> 6. `vercel deploy --prod`
