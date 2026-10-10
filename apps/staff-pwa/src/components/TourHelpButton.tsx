import React from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TourHelpButton({ onRestart }: { onRestart?: () => void }) {
  const handleRestartTour = () => {
    try {
      localStorage.removeItem("tour_seen:/home:v1.8.0");
      toast.info("Đang khởi động lại hướng dẫn giao diện...");
      if (onRestart) {
        onRestart();
      } else {
        window.location.reload();
      }
    } catch {}
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-20 right-4 z-40 rounded-full bg-amber-500/20 hover:bg-amber-500/30 backdrop-blur-sm shadow-md border border-amber-500/30 text-amber-700 h-10 w-10 cursor-pointer"
            onClick={handleRestartTour}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Xem lại hướng dẫn giao diện</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
