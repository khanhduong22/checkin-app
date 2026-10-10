import React from "react";
import { Clock, Calendar, Briefcase, Wallet, User } from "lucide-react";

export type NavTab = "home" | "schedule" | "tasks" | "payroll" | "profile";

interface BottomNavigationProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  userRole?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onChangeTab,
  userRole,
}) => {
  const isPartner = userRole === "PARTNER";

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = isPartner
    ? [
        { id: "home", label: "Tổng quan", icon: Clock },
        { id: "tasks", label: "Sàn việc", icon: Briefcase },
        { id: "payroll", label: "Bảng lương", icon: Wallet },
        { id: "profile", label: "Cá nhân", icon: User },
      ]
    : [
        { id: "home", label: "Chấm công", icon: Clock },
        { id: "schedule", label: "Lịch trực", icon: Calendar },
        { id: "tasks", label: "Sàn việc", icon: Briefcase },
        { id: "payroll", label: "Bảng lương", icon: Wallet },
        { id: "profile", label: "Cá nhân", icon: User },
      ];

  const gridColsClass = isPartner ? "grid-cols-4" : "grid-cols-5";

  return (
    <nav
      role="navigation"
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none select-none pb-safe"
    >
      <div className="max-w-md mx-auto pointer-events-auto bg-[#faf6f0]/95 backdrop-blur-md border-t border-orange-100/90 shadow-lg">
        <div className={`grid ${gridColsClass} h-14 items-center px-1`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`relative flex flex-col items-center justify-center h-full py-1 px-1 transition-all duration-150 active:scale-95 cursor-pointer ${
                  isActive
                    ? "text-amber-800 font-bold"
                    : "text-stone-500 hover:text-stone-700 font-medium"
                }`}
              >
                {/* Active Pill Indicator */}
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-amber-500 rounded-b-full shadow-xs" />
                )}

                <div className="relative mt-0.5">
                  <Icon
                    className={`w-4.5 h-4.5 transition-transform duration-150 ${
                      isActive ? "scale-105 text-amber-700" : "text-stone-400"
                    }`}
                  />
                </div>

                <span className="text-[10px] tracking-tight mt-0.5 line-clamp-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
