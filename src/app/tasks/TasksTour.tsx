
"use client";

import { useEffect, useState } from "react";
import TourGuide from "@/components/TourGuide";
import { Step } from "react-joyride";

const TOUR_STEPS: Step[] = [
    {
        target: "#tab-market",
        content: "🆕 Task Market: Nơi đăng các công việc cụ thể (Design, Code, v.v) với mức thưởng hấp dẫn.",
        placement: "bottom",
    },
    {
        target: "#marketplace-list",
        content: "Danh sách các việc đang cần người làm. Bạn có thể xem chi tiết và bấm 'Nhận Task' để bắt đầu làm.",
        placement: "top",
    },
    {
        target: "#tab-general",
        content: "Các công việc chung (Seeding, Review, v.v) có thể làm nhiều lần, không giới hạn người nhận.",
        placement: "bottom",
    },
    {
        target: "#tab-my-tasks",
        content: "Xem lại các công việc bạn đã nhận và nộp minh chứng (link/ảnh) để Admin duyệt thưởng.",
        placement: "bottom",
    }
];

export default function TasksTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem("tour_seen:/tasks:v1.8.0");
        const isMobile = window.innerWidth < 768; // Optional: disable on mobile if needed, or adjust steps
        if (!hasSeen) {
            setTimeout(() => setRun(true), 0);
        }
    }, []);

    const handleFinish = () => {
        localStorage.setItem("tour_seen:/tasks:v1.8.0", "true");
        setRun(false);
    };

    return <TourGuide steps={TOUR_STEPS} run={run} onFinish={handleFinish} />;
}
