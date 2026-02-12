
"use client";

import { useEffect, useState } from "react";
import TourGuide from "@/components/TourGuide";
import { Step } from "react-joyride";

const TOUR_STEPS: Step[] = [
    {
        target: "#create-request-btn",
        content: "Bạn có thể tạo yêu cầu mới tại đây. Bây giờ đã hỗ trợ xin làm việc từ xa (WFH)!",
        placement: "bottom",
    }
];

export default function RequestsTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem("tour_seen:/requests:v1.8.0");
        if (!hasSeen) {
            setRun(true);
        }
    }, []);

    const handleFinish = () => {
        localStorage.setItem("tour_seen:/requests:v1.8.0", "true");
        setRun(false);
    };

    return <TourGuide steps={TOUR_STEPS} run={run} onFinish={handleFinish} />;
}
