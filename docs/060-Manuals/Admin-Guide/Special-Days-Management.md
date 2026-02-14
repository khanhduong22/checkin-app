# Quản lý Ngày đặc biệt (Sinh nhật & Kỷ niệm)

Tính năng **Special Day Reminders** giúp hệ thống tự động nhận diện và chúc mừng nhân viên vào các dịp đặc biệt như **Sinh nhật** (Birthday) và **Kỷ niệm ngày làm việc** (Work Anniversary).

## 1. Thiết lập Ngày đặc biệt (Dành cho Admin)

Để hệ thống có thể hiển thị chúc mừng, Admin cần cập nhật thông tin ngày sinh và ngày bắt đầu làm việc cho nhân viên.

### Các bước thực hiện:

1.  Truy cập vào trang **Danh sách nhân sự**:
    -   Menu Admin -> **Employees** (Nhân viên).
    -   Hoặc đường dẫn: `/admin/employees`.

2.  Tìm nhân viên cần cập nhật trong danh sách.

3.  Nhấn vào biểu tượng **Lịch (📅)** nằm ở cột thao tác (bên cạnh nút Xóa 🗑️).

4.  Một hộp thoại (Dialog) sẽ hiện ra:
    -   **Ngày sinh**: Chọn ngày tháng năm sinh của nhân viên.
    -   **Ngày vào làm**: Chọn ngày nhân viên bắt đầu làm việc chính thức tại công ty.

5.  Nhấn **Lưu thay đổi**.

> [!NOTE]
> Hệ thống sẽ lưu trữ và tự động tính toán số năm làm việc dựa trên "Ngày vào làm".

---

## 2. Hiển thị trên Dashboard

Khi đến ngày đặc biệt, bất kỳ ai (kể cả nhân viên đó) khi truy cập vào **Dashboard (Trang chủ)** đều sẽ thấy:

1.  **Hiệu ứng Pháo hoa (Confetti)**:
    -   Hiệu ứng tung giấy màu rực rỡ diễn ra trong 5 giây ngay khi vào trang.
    
2.  **Widget Chúc mừng**:
    -   Một thẻ chúc mừng nổi bật xuất hiện ở đầu trang.
    -   Hiển thị Avatar của nhân viên có ngày đặc biệt.
    -   **Nội dung chúc mừng**:
        -   *Sinh nhật*: "Happy Birthday! 🎂" kèm lời chúc ý nghĩa.
        -   *Kỷ niệm*: "Work Anniversary! 🏆" kèm số năm cống hiến.
        -   *Trùng cả hai*: "Niềm vui nhân đôi! 🎂🏆".

## 3. Câu hỏi thường gặp (FAQ)

**Q: Nếu tôi nhập sai ngày thì sao?**
A: Bạn có thể mở lại hộp thoại (nhấn icon 📅) và chọn lại ngày đúng, sau đó Lưu lại. Dữ liệu sẽ được cập nhật ngay lập tức.

**Q: Hiệu ứng pháo hoa có làm chậm máy không?**
A: Không. Hiệu ứng sử dụng CSS Animation nhẹ nhàng, không gây tải nặng cho trình duyệt và tự động tắt sau 5 giây.

**Q: Nhân viên có tự chỉnh ngày sinh của mình được không?**
A: Hiện tại tính năng này chỉ dành cho **Admin**. Nhân viên cần liên hệ Admin/HR để cập nhật thông tin nếu sai sót.
