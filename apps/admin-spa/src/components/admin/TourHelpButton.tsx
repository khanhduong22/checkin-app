import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TourHelpButton() {
  const location = useLocation();

  const handleRestartTour = () => {
    const storageKey = `tour_seen:${location.pathname}`;
    localStorage.removeItem(storageKey);
    toast.info("Đang khởi động lại hướng dẫn...");
    window.location.reload();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 right-4 z-40 rounded-full bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-800 shadow-lg"
            onClick={handleRestartTour}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Xem lại hướng dẫn</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
