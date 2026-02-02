
export const CHANGELOGS = [
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

export const LATEST_VERSION = CHANGELOGS[0].version;
