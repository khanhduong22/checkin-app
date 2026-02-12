"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTheme } from "next-themes";

interface TourGuideProps {
  steps: Step[];
  run: boolean;
  onFinish?: () => void;
}

export default function TourGuide({ steps, run, onFinish }: TourGuideProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      if (onFinish) onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: theme === "dark" ? "#10b981" : "#059669", // emerald-500/600
          textColor: theme === "dark" ? "#fff" : "#333",
          backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
        },
        buttonClose: {
            display: 'none',
        },
        tooltipContainer: {
            textAlign: 'left'
        }
      }}
      locale={{
        back: "Quay lại",
        close: "Đóng",
        last: "Hoàn tất",
        next: "Tiếp tục",
        skip: "Bỏ qua",
      }}
    />
  );
}
