"use client";

import { useEffect, useState } from "react";
import TourGuide from "@/components/TourGuide";
import { Step } from "react-joyride";

const TOUR_STEPS: Step[] = [
    {
        target: "body",
        placement: "center",
        content: <div className="text-center font-bold">👋 Chào mừng bạn đến với Check-in System!</div>,
    },
    {
        target: "#home-announcement",
        content: "Cập nhật các thông báo mới nhất từ công ty. Đừng bỏ lỡ nhé!",
        placement: "bottom",
    },
    {
        target: "#home-user-info",
        content: "Thông tin cá nhân, danh hiệu và cấp bậc của bạn.",
        placement: "bottom",
    },
    {
        target: "#home-privacy-stats",
        content: "Xem nhanh lương tạm tính và số công trong tháng. Bạn có thể ẩn đi nếu muốn riêng tư.",
        placement: "bottom",
    },
    {
        target: "#home-checkin-buttons",
        content: "Khu vực quan trọng nhất! Hãy Check-in đúng giờ và Check-out khi ra về.",
        placement: "top",
    },
    {
        target: "#home-gacha",
        content: "Điểm danh hàng ngày để quay thưởng và nhận quà ngẫu nhiên.",
        placement: "top",
    },
    {
        target: "#home-sticky",
        content: "Bảng tin nội bộ - nơi mọi người để lại lời nhắn hoặc chia sẻ cảm xúc.",
        placement: "top",
    },
    {
        target: "#home-nav",
        content: "Truy cập nhanh vào Lịch sử, Bảng lương và Đăng ký lịch làm việc.",
        placement: "top",
    },
    {
        target: 'a[href="/schedule"]',
        content: "Đăng ký lịch làm việc hàng tuần tại đây.",
        placement: "top",
    },
    {
        target: 'a[href="/requests"]',
        content: "Tạo các yêu cầu giải trình, xin nghỉ phép, hoặc đi muộn/về sớm.",
        placement: "top",
    },
    {
        target: 'a[href="/tasks"]',
        content: "🆕 WFH & Task Center: Nhận các công việc làm thêm (Design, Code, Seeding...) để tăng thu nhập!",
        placement: "top",
    }
];

export default function HomeTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem("tour_seen:/home:v1.7.0");
        if (!hasSeen) {
            setRun(true);
        }
    }, []);

    const handleFinish = () => {
        localStorage.setItem("tour_seen:/home:v1.7.0", "true");
        setRun(false);
    };

    return <TourGuide steps={TOUR_STEPS} run={run} onFinish={handleFinish} />;
}
