'use client';

import dynamic from "next/dynamic";

const ScheduleCalendar = dynamic(
    () => import("./ScheduleCalendar"),
    { ssr: false }
);

export default ScheduleCalendar;
