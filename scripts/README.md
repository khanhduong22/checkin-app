# Hướng dẫn Import dữ liệu từ Excel

Script này giúp bạn migrate dữ liệu nhân viên, lịch sử chấm công và ca làm việc từ file Excel vào database.

## 1. Chuẩn bị file Excel
Tạo file Excel (.xlsx) với các sheet sau (tên sheet không phân biệt hoa thường, nhưng phải chứa từ khóa):

### Sheet "Users" (Thông tin nhân viên)
| email | name | role | employmentType | hourlyRate |
|-------|------|------|----------------|------------|
| nguyenivan@gmail.com | Nguyễn Văn A | ADMIN | FULL_TIME | 50000 |
| tranthib@gmail.com | Trần Thị B | USER | PART_TIME | 25000 |

*Lưu ý:*
- `email`: Bắt buộc, dùng để định danh và liên kết với Google Login sau này.
- `role`: `ADMIN` hoặc `USER` (mặc định USER).
- `employmentType`: `FULL_TIME` hoặc `PART_TIME` (mặc định PART_TIME).
- `hourlyRate`: Mức lương theo giờ (số).

### Sheet "CheckIns" (Lịch sử chấm công - Tùy chọn)
| email | timestamp | type | ipAddress |
|-------|-----------|------|-----------|
| nguyenivan@gmail.com | 2024-01-01 08:00:00 | checkin | 192.168.1.1 |
| nguyenivan@gmail.com | 2024-01-01 17:00:00 | checkout | 192.168.1.1 |

*Lưu ý:*
- `timestamp`: Ngày giờ (VD: `2024-01-01 08:00`). Định dạng chuẩn Date của Excel.
- `type`: `checkin` hoặc `checkout`.

### Sheet "Shifts" (Lịch làm việc - Tùy chọn)
| email | start | end |
|-------|-------|-----|
| tranthib@gmail.com | 2024-02-01 08:00 | 2024-02-01 12:00 |

## 2. Cài đặt thư viện
Nếu chưa cài đặt, chạy lệnh:
```bash
npm install xlsx
```

## 3. Chạy script import
Đặt file Excel của bạn ở thư mục gốc (hoặc bất kỳ đâu), ví dụ `data.xlsx`.

Chạy lệnh:
```bash
npx ts-node scripts/import_excel.ts data.xlsx
```

## 4. Kiểm tra kết quả
- Mở Prisma Studio để xem dữ liệu:
```bash
npx prisma studio
```
- Khi nhân viên đăng nhập bằng Google với email tương ứng, hệ thống sẽ tự động nhận diện tài khoản vừa tạo và hiển thị dữ liệu lịch sử/lịch làm việc của họ.
