"use client";

import { useEffect, useState } from "react";
import TourGuide from "@/components/TourGuide";
import { Step } from "react-joyride";
import { usePathname } from "next/navigation";

const TOUR_STEPS: Record<string, Step[]> = {
  "/admin": [
    {
      target: "body",
      placement: "center",
      content: <div className="text-center font-bold">👋 Chào mừng đến với Admin Panel!</div>,
    },
    {
      target: "#admin-sidebar",
      content: "Thanh menu bên trái giúp bạn truy cập nhanh vào tất cả các chức năng quản lý.",
      placement: "right",
    },
    {
      target: "#dashboard-salary-card",
      content: "Theo dõi tổng lương tạm tính của tháng hiện tại và dự kiến.",
      placement: "bottom",
    },
    {
      target: "#dashboard-requests-card",
      content: "Xem số lượng yêu cầu (nghỉ phép/giải trình) đang chờ duyệt.",
      placement: "bottom",
    },
    {
      target: "#dashboard-checkin-activity",
      content: "Giám sát hoạt động chấm công ra/vào theo thời gian thực.",
      placement: "top-start",
    },
    {
      target: "#dashboard-today-schedule",
      content: "Danh sách nhân viên có lịch làm việc trong ngày hôm nay.",
      placement: "left",
    },
  ],
  "/admin/employees": [
    {
      target: "body",
      placement: "center",
      content: <div className="text-center font-bold">👥 Quản lý Nhân sự</div>,
    },
    {
      target: "#user-manager-card",
      content: "Danh sách toàn bộ nhân viên. Bạn có thể chỉnh sửa tên, mức lương, hoặc cấp quyền Admin tại đây.",
      placement: "top-start",
    },
  ],
  "/admin/schedule": [
    {
      target: "body",
      placement: "center",
      content: <div className="text-center font-bold">📅 Lịch làm việc</div>,
    },
    {
      target: "#schedule-calendar-container",
      content: "Xem và xếp lịch làm việc cho nhân viên. Kéo thả để chọn giờ, bấm vào lịch để đăng ký ca.",
      placement: "top-start",
    },
  ],
  "/admin/reports": [
    {
      target: "body",
      placement: "center",
      content: <div className="text-center font-bold">📈 Báo cáo & Thành tích</div>,
    },
    {
      target: "#report-summary-stats",
      content: "Tổng quan các chỉ số quan trọng: Lương, Giờ làm, Nhân sự.",
      placement: "bottom",
    },
    {
      target: "#report-top-hardworking",
      content: "Vinh danh những nhân viên chăm chỉ nhất tháng.",
      placement: "right",
    },
    {
      target: "#report-violations",
      content: "Theo dõi các trường hợp đi muộn/về sớm để nhắc nhở.",
      placement: "top-start",
    },
  ],
  "/admin/requests": [
    {
        target: "body",
        placement: "center",
        content: <div className="text-center font-bold">📩 Duyệt Yêu Cầu</div>,
    },
    {
        target: "#request-admin-list",
        content: "Danh sách các đơn xin nghỉ phép hoặc giải trình chấm công. Bạn có thể Duyệt hoặc Từ chối.",
        placement: "top-start",
    }
  ],
  "/admin/announcements": [
      {
          target: "body",
          placement: "center",
          content: <div className="text-center font-bold">📢 Quản lý Thông báo</div>,
      },
      {
          target: "#announcement-new-btn",
          content: "Bấm vào đây để tạo thông báo mới hiển thị lên Trang chủ.",
          placement: "bottom"
      },
      {
          target: "#announcement-list",
          content: "Danh sách các thông báo đã đăng. Bạn có thể Tắt/Bật chúng.",
          placement: "top-start"
      }
  ],
  "/admin/payroll": [
      {
          target: "body",
          placement: "center",
          content: <div className="text-center font-bold">💰 Bảng Lương</div>,
      },
      {
          target: "#payroll-search-input",
          content: "Tìm kiếm nhân viên để xem lương chi tiết.",
          placement: "bottom"
      },
      {
          target: ".w-[180px]", // Select trigger wrapper
          content: "Chọn tháng để xem lịch sử lương hoặc chốt lương cho tháng hiện tại.",
          placement: "bottom"
      },
      {
          target: ".w-[150px]", // Bonus input wrapper
          content: "Nhập % thưởng thêm và chọn đối tượng áp dụng (Part-time/Full-time).",
          placement: "bottom"
      },
      {
          target: "#payroll-table-container",
          content: "Bảng lương chi tiết. Bấm nút (±) để Thưởng/Phạt, hoặc nút Chi tiết để xem hồ sơ.",
          placement: "top-start"
      },
      {
          target: "#payroll-export-btn",
          content: "Xuất bảng lương ra file Excel để gửi kế toán.",
          placement: "left"
      }
  ],
  "/admin/lucky-wheel": [
      {
          target: "body",
          placement: "center",
          content: <div className="text-center font-bold">🎰 Vòng Quay May Mắn</div>,
      },
      {
          target: "#lucky-wheel-available",
          content: "Kho quà hiện có. Bạn có thể thêm/xóa các phần thưởng tại đây.",
          placement: "bottom"
      },
      {
          target: "#lucky-wheel-prizes-list",
          content: "Cấu hình chi tiết xác suất trúng thưởng cho từng món quà.",
          placement: "top-start"
      }
  ],
  "/admin/settings": [
      {
          target: "body",
          placement: "center",
          content: <div className="text-center font-bold">⚙️ Cấu hình Hệ thống</div>,
      },
      {
          target: "#ip-manager-card",
          content: "Cấu hình dải IP mạng văn phòng. Chỉ những IP này mới chấm công được.",
          placement: "bottom"
      },
      {
          target: "#holiday-manager-card",
          content: "Thiết lập các ngày Lễ để nhân hệ số lương (ví dụ x3, x4).",
          placement: "top-start"
      },
      {
          target: "#backup-data-section",
          content: "Sao lưu toàn bộ dữ liệu hệ thống (User, Checkin, Lương...) về máy.",
          placement: "top-start"
      }
  ],
  "/admin/tasks": [
    {
        target: "body",
        placement: "center",
        content: <div className="text-center font-bold">📝 Quản lý WFH</div>,
    },
    {
        target: '#tab-trigger-review',
        content: "Nơi duyệt các bài nộp của nhân viên. Hệ thống sẽ tự động tính deadline và gợi ý phạt nếu quá hạn.",
        placement: "bottom"
    },
    {
        target: '#tab-trigger-definitions',
        content: "Cấu hình danh sách công việc chung (Seeding, Review...).",
        placement: "bottom"
    },
    {
        target: '#tab-trigger-items',
        content: "🆕 Task Marketplace: Đăng các job cụ thể (Deadline, Mức thưởng riêng) để nhân viên nhận.",
        placement: "bottom"
    }
  ]
};

export default function AdminTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Check if we have steps for this path
    const currentSteps = TOUR_STEPS[pathname];
    
    if (currentSteps && currentSteps.length > 0) {
        const storageKey = `tour_seen:${pathname}`;
        const hasSeen = localStorage.getItem(storageKey);

        if (!hasSeen) {
            const timer = setTimeout(() => {
                setSteps(currentSteps);
                setRun(true);
            }, 0);
            return () => clearTimeout(timer);
        }
    } else {
        const timer = setTimeout(() => {
            setRun(false);
        }, 0);
        return () => clearTimeout(timer);
    }
  }, [pathname]);

  const handleFinish = () => {
    const storageKey = `tour_seen:${pathname}`;
    localStorage.setItem(storageKey, "true");
    setRun(false);
  };

  if (!run || steps.length === 0) return null;

  return <TourGuide steps={steps} run={run} onFinish={handleFinish} />;
}
