export const CHANGELOGS = [
  {
    version: '1.8.0',
    date: '14/02/2026',
    title: 'Special Day Reminders & UI Update',
    tags: ['Feature', 'Celebration', 'UI'],
    changes: [
      '🎂 **Happy Birthday**: Tự động nhận diện và chúc mừng sinh nhật nhân viên ngay trên Dashboard với hiệu ứng pháo hoa rực rỡ.',
      '🏆 **Work Anniversary**: Kỷ niệm ngày làm việc (Work Anniversary) để tri ân sự đóng góp của nhân viên lâu năm.',
      '📅 **Quản lý Ngày đặc biệt**: Admin có thể cập nhật Ngày sinh và Ngày bắt đầu làm việc trong hồ sơ nhân viên một cách dễ dàng.',
      '✨ **Confetti Effect**: Hiệu ứng tung hoa chúc mừng sinh động, mang lại niềm vui bất ngờ cho nhân viên.'
    ]
  },
  {
    version: '1.7.0',
    date: '12/02/2026',
    title: 'Work From Home & Task Management',
    tags: ['WFH', 'Feature', 'Income'],
    changes: [
      '🏠 **Work From Home**: Tính năng nhận việc làm thêm tại nhà (WFH) chính thức ra mắt. Anh em có thể nhận task và kiếm thêm thu nhập ngoài giờ hành chính.',
      '📝 **Task Management**: Hệ thống quản lý đầu việc, nộp báo cáo và duyệt tự động. Có cơ chế thưởng/phạt rõ ràng.',
      '⚠️ **Quy định Chặt chẽ**: Chỉ được Start task khi đã Check-out khỏi văn phòng. Quá hạn 1 tuần sẽ bị penalty 50%.'
    ]
  },
  {
    version: '1.5.0',
    date: '04/02/2026',
    title: 'Tối ưu Dashboard & Chấm công',
    tags: ['Admin', 'Dashboard', 'Fix'],
    changes: [
      '🚀 **Dashboard Gọn Gàng**: Tinh giản giao diện Admin, ẩn các chỉ số ít dùng, tập trung vào Lương & Đơn từ.',
      '💰 **Dự phóng Lương**: Hiển thị tổng lương tạm tính kèm con số "Dự kiến cuối tháng" để Sếp dễ cân đối ngân sách.',
      '🛠️ **Chấm công hộ v2.0**: Admin chấm hộ sẽ hiện rõ Note trong bảng công. Fix lỗi tính "Đi muộn" cho nhân viên Part-time (đã trừ 5p đi đường).',
      '🔔 **UI/UX**: Thay thế các cảnh báo (Alert) cũ kỹ bằng Popup thông báo (Toast) hiện đại, mượt mà.'
    ]
  },
  {
    version: '1.6.0',
    date: '12/02/2026',
    title: 'Hướng dẫn sử dụng & Trải nghiệm mới',
    tags: ['Tour', 'UX', 'Admin'],
    changes: [
      '🧭 **Guided Tour**: Hệ thống hướng dẫn sử dụng tương tác (Interactive Tour) cho toàn bộ trang Admin. Giúp người quản lý mới làm quen hệ thống chỉ trong 1 nốt nhạc.',
      '✨ **Trải nghiệm mượt mà**: Tối ưu UI/UX, thêm các chỉ dẫn trực quan tại các khu vực quan trọng (Bảng lương, Cấu hình, Duyệt đơn...).'
    ]
  },
  {
    version: '1.4.0',
    date: '03/02/2026',
    title: 'Hồ sơ Nhân viên & Lương Full-time',
    tags: ['Admin', 'Payroll', 'Profile'],
    changes: [
      '👤 **Hồ sơ Nhân viên 360**: Admin có thể xem chi tiết: Bảng công, Lương, Thưởng/Phạt, Lịch sử nghỉ phép của từng nhân sự tại một nơi duy nhất.',
      '⚙️ **Tự động hóa Lương Full-time**: Hệ thống tự động tính công chuẩn (trừ Chủ nhật) và tự động trừ lương khi có đơn "Xin nghỉ phép" được duyệt.',
      '🔗 **Liên kết thông minh**: Dễ dàng điều hướng giữa Danh sách nhân sự - Bảng lương - Chi tiết cá nhân.',
      '🎪 **Fun Update**: Thêm hàng loạt danh hiệu "lầy lội" vào Vòng quay nhân phẩm (Chiến thần Deadline, Đại gia Trà sữa...).'
    ]
  },
  {
    version: '1.3.0',
    date: '03/02/2026',
    title: 'Vòng Quay May Mắn & Thưởng Tự Động',
    tags: ['Lucky Wheel', 'Money', 'Feature'],
    changes: [
      '🎰 **Vòng Quay Nhân Phẩm**: Ra mắt giao diện vòng quay mới cực xịn xò với hiệu ứng Confetti.',
      '💸 **Tự Động Cộng Thưởng**: Quay trúng ô Tiền mặt -> Tiền tự động bay thẳng vào Bảng lương (hết cảnh chờ Admin ghi sổ tay).',
      '🏆 **Danh hiệu Độc Quyền**: Săn danh hiệu hiếm từ vòng quay để khoe trên bảng xếp hạng.',
      '⚡ **Fix Lỗi**: Sửa lỗi hiển thị sai giờ trên Dashboard (giờ đã chuẩn giờ Việt Nam).'
    ]
  },
  {
    version: '1.2.0',
    date: '02/02/2026',
    title: 'Nâng cấp Trải nghiệm Quản lý',
    tags: ['Dashboard', 'Schedule', 'UX'],
    changes: [
      '📊 **Dashboard Chi tiết**: Tách riêng chỉ số lượt Check-in và Check-out trong ngày.',
      '⏱️ **Giám sát Thời gian thực**: Tự động tính toán và hiển thị trạng thái "Sớm/Trễ" (ví dụ: Trễ 5p) ngay trên bảng hoạt động, so khớp chính xác với ca làm việc.',
      '📅 **Lịch làm việc Thông minh**: Hỗ trợ Kéo & Thả (Drag-n-Drop) để đổi ca nhanh chóng, Kéo mép (Resize) để tăng giảm giờ làm.',
      '🎨 **Giao diện**: Màu sắc phân định rõ ràng (Xanh = Vào ca, Cam/Đỏ = Ra ca/Đi muộn).'
    ]
  },
  {
    version: '1.1.0',
    date: '30/01/2026',
    title: 'Quản lý Lương & Dữ liệu',
    tags: ['Payroll', 'Data'],
    changes: [
      '💰 **Bảng lương**: Chuyển đổi sang giao diện bảng (Table) chi tiết, dễ đối soát.',
      '👥 **Đinh danh**: Cập nhật hiển thị theo Nickname (Nía, Thư, Ngân...) thay vì Email dài.',
      '📥 **Import**: Thêm công cụ nhập liệu lịch làm việc theo tuần và backup dữ liệu Excel.'
    ]
  },
  {
    version: '1.0.0',
    date: '01/01/2026',
    title: 'Initial Release',
    tags: ['Core'],
    changes: [
      'Hệ thống chấm công cơ bản (IP Based).',
      'Tính lương tự động.',
      'Gamification (Gacha, Shop, Pet).'
    ]
  }
];

export const LATEST_VERSION = '1.8.0';
