
"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TourHelpButton() {
    const pathname = usePathname();

    const handleRestartTour = () => {
        let storageKey = "";
        
        // Define keys based on path
        if (pathname === "/") {
            storageKey = "tour_seen:/home:v1.7.0"; // Matches HomeTour.tsx
        } else if (pathname.startsWith("/admin")) {
            storageKey = `tour_seen:${pathname}`; // Matches AdminTour.tsx logic
        } else if (pathname === "/tasks") {
            storageKey = "tour_seen:/tasks:v1.8.0"; // Matches TasksTour.tsx
        } else if (pathname === "/requests") {
            storageKey = "tour_seen:/requests:v1.8.0"; // Matches RequestsTour.tsx
        }

        if (storageKey) {
            localStorage.removeItem(storageKey);
            toast.info("Đang khởi động lại hướng dẫn...");
            // Small delay to allow UI to update/state reset if needed, 
            // but simple reload is most reliable for resetting the "run" state in the Tour components 
            // since they check localStorage on mount.
            window.location.reload();
        } else {
            toast.info("Không có hướng dẫn cho trang này.");
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary/20 hover:bg-primary/30 backdrop-blur-sm shadow-md border border-primary/20 text-primary"
                        onClick={handleRestartTour}
                    >
                        <HelpCircle className="h-6 w-6" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Xem lại hướng dẫn</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
