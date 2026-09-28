# Hướng dẫn: Nhiệm vụ Ca làm việc (Shift Duty) & Cảnh báo Check-out

> Tài liệu hướng dẫn sử dụng tính năng **Nhiệm vụ Ca làm việc (`ShiftDuty`)**, quy trình Check-in hiện Popup, xem chéo nhiệm vụ của đồng nghiệp cùng ca và cơ chế cảnh báo nhắc nhở khi Check-out (Cách 2).  
> Tách riêng độc lập khỏi module KPI / Công việc khoán (`StaffTask`).  
> Cập nhật: 28/09/2026

---

## 1. Tổng quan Kiến trúc & Điểm mới

1. **Tách riêng biệt module**:
   - **Nhiệm vụ ca làm việc (`ShiftDuty`)**: Dành riêng cho checklist công việc vận hành hàng ngày của ca làm (quầy kệ, kiểm date, vệ sinh...). Tích chọn hoàn thành trực tiếp, không bắt buộc nộp ảnh/link bằng chứng hay quy trình duyệt phức tạp.
   - **Công việc và KPI (`StaffTask`)**: Dành riêng cho KPI chỉ tiêu dài hạn, giao việc khoán WFH, nghiệm thu và chấm điểm thưởng/phạt.
2. **Bố cục giao diện Trang chủ mới**:
   - Vị trí nút **Vòng quay nhân phẩm**: Đã được chuyển xuống **dưới cùng** của trang.
   - Thay thế vào vị trí cũ (dưới Bảng tin thông báo): Nút **"📋 Nhiệm vụ ca làm việc"**.
3. **Xem chéo nhiệm vụ**:
   - Nhân viên khi mở xem nhiệm vụ có 2 tab:
     - **"Việc của tôi"**: Checklist các nhiệm vụ cá nhân được giao trong ca hôm nay, bấm để tick hoàn thành.
     - **"Cả ca làm"**: Danh sách các bạn đồng nghiệp đang có ca làm việc hôm nay và nhiệm vụ chi tiết của từng người, giúp phối hợp công việc trơn tru.

---

## 2. Dành cho Quản trị viên (Admin)

### 2.1. Giao việc cho nhân viên theo ca làm
Admin có thể giao việc theo 2 cách cực kỳ nhanh chóng:

1. **Cách 1: Giao trực tiếp từ Widget Trang chủ ("Nhiệm vụ ca làm việc")**
   - Bấm vào nút **"📋 Nhiệm vụ ca làm việc"** trên trang chủ.
   - Bấm nút **"+ Giao việc"** (chỉ hiển thị với Admin).
   - Chọn nhân viên muốn giao (tự động lọc danh sách nhân sự đang hoạt động).
   - Nhập **Tên công việc** (tùy chỉnh) và **Mô tả chi tiết** (hướng dẫn cụ thể).
   - Bấm **"Giao việc ngay"**.
2. **Cách 2: Giao tại Lịch làm việc (`/schedule` hoặc `/admin/schedule`)**
   - Bấm vào bất kỳ ca làm việc nào của nhân viên trên lịch.
   - Trong bảng quản lý ca, mở phần **"Nhiệm vụ ca làm"** và bấm **"+ Giao việc ca này"**.
   - Nhập tên và mô tả công việc rồi bấm **"Lưu & Giao việc"**. Hệ thống tự động gắn vào đúng ca làm và ngày làm việc của nhân sự đó.

### 2.2. Xóa nhiệm vụ nếu lỡ giao nhầm (Thu hồi việc)
- Nếu Admin giao nhầm nhân viên hoặc nhầm ca làm:
  - Bấm vào biểu tượng **Thùng rác đỏ (Trash)** bên cạnh nhiệm vụ đó (tại popup Trang chủ, bảng Drawer bên phải trên Lịch, hoặc modal ca làm).
  - Xác nhận xóa: Nhiệm vụ sẽ lập tức được thu hồi an toàn khỏi danh sách của nhân viên.

### 2.3. Xem nhiệm vụ trên Lịch làm việc (`/admin/schedule`) không bị rối
Để Admin kiểm soát toàn bộ nhiệm vụ trong tuần mà không làm chật chội các ô ca làm trên lịch:
1. **Huy hiệu gọn gàng trên ô ca (Compact Duty Badge)**:
   - Ca nào có nhiệm vụ sẽ hiển thị một huy hiệu nhỏ tinh tế ở góc dưới (ví dụ `📋 2 việc` hoặc `📋 1/2`).
   - Ca không có nhiệm vụ giữ nguyên 100% sự thông thoáng, sạch sẽ như trước.
2. **Nút "📋 Bảng nhiệm vụ tuần này" (Slide-over Drawer)**:
   - Nằm ngay thanh công cụ trên cùng của Lịch kèm số đếm tổng nhiệm vụ trong tuần hiện tại.
   - Khi bấm, một bảng trượt mượt mà mở ra từ bên phải màn hình, tổng hợp toàn bộ 7 ngày trong tuần: liệt kê từng ca làm việc, ai trực ca nào, các nhiệm vụ cụ thể, mô tả và trạng thái hoàn thành.
   - Có sẵn nút **"+ Giao việc"** nhanh và nút xóa nhiệm vụ trực tiếp ngay trên bảng trượt.
3. **Công tắc "Hiện chi tiết việc trên lịch"**:
   - Mặc định tắt để giữ lịch gọn gàng.
   - Khi bật, tên từng đầu việc sẽ bung trực tiếp bên trong các khối ca làm trên lịch tuần.

---

## 3. Dành cho Nhân viên (Staff)

### 3.1. Popup nhiệm vụ ngay sau khi Check-in
1. Sau khi đến nơi làm việc và kết nối Wi-Fi, nhân viên bấm **"📍 Check-in"**.
2. Hệ thống ghi nhận chấm công thành công và **tự động bật Popup thông báo**:
   - Tiêu đề: *"Check-in thành công! Nhiệm vụ của bạn hôm nay là:"*
   - Liệt kê toàn bộ nhiệm vụ được giao trong ngày/ca hôm nay kèm mô tả hướng dẫn chi tiết.
   - Cho phép nhân viên **bấm vào từng mục để tick hoàn thành ngay** nếu đã xong.
   - Bấm **"Đã hiểu & Bắt đầu ca làm"** để đóng popup.

### 3.2. Xem lại nhiệm vụ cá nhân & đồng nghiệp cùng ca
- Bất kỳ lúc nào trong ca, nhân viên chỉ cần bấm vào nút **"📋 Nhiệm vụ ca làm việc"** ở trang chủ:
  - **Tự động hiển thị Tab "Cả ca làm" trước tiên**: Giúp nhân viên ngay lập tức nắm bắt danh sách tất cả đồng nghiệp đang cùng ca trực hôm nay và công việc được giao của từng người để tiện phối hợp, hỗ trợ và phân chia quầy/khu vực. Tại đây cũng có sẵn thanh tóm tắt tiến độ việc của bản thân và nút bấm chuyển nhanh.
  - **Tab "Việc của tôi"**: Xem danh sách việc của riêng mình, tiến độ `X/Y xong`, bấm vào từng việc để đánh dấu hoàn thành (có gạch ngang chữ và đổi sang màu xanh lá).

### 3.3. Cơ chế Check-out (Cách 2: Cảnh báo nhắc nhở nhẹ)
- Khi hết ca làm việc, nhân viên bấm **"👋 Check-out"**.
- **Nếu tất cả nhiệm vụ đã được đánh dấu hoàn thành**: Hệ thống thực hiện Check-out bình thường.
- **Nếu vẫn còn nhiệm vụ chưa hoàn thành**:
  - Hệ thống bật hộp thoại nhắc nhở:  
    *⚠️ "Nhiệm vụ ca làm chưa hoàn thành! Bạn còn X nhiệm vụ trong ca hôm nay chưa được đánh dấu hoàn thành. Bạn có chắc chắn muốn Check-out không?"*
  - Danh sách các công việc chưa xong được liệt kê rõ ràng.
  - Nhân viên có 2 lựa chọn:
    1. **"📋 Kiểm tra nhiệm vụ"**: Mở lại danh sách nhiệm vụ để xem lại hoặc đánh dấu hoàn thành những việc đã làm xong.
    2. **"Vẫn Check-out"**: Xác nhận tiếp tục Check-out ra về (không bị khóa cứng).
