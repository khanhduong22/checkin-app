import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import PayrollDetailView from "@/components/PayrollDetailView";
import PayrollMonthSelector from "@/components/PayrollMonthSelector";
import PayrollExplanationModal from "@/components/PayrollExplanationModal";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";

export const PayrollView: React.FC = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: response, isLoading } = useSWR<{
    success: boolean;
    data: {
      stats: any;
      isClosed: boolean;
      month: number;
      year: number;
    };
  }>(`/api/staff/payroll?month=${selectedMonth}&year=${selectedYear}`, fetcher);

  const monthOptions = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
    });
  }

  const handleMonthChange = (val: string) => {
    const [y, m] = val.split("-");
    setSelectedYear(parseInt(y));
    setSelectedMonth(parseInt(m));
  };

  const payrollData = response?.data;
  const isClosed = payrollData?.isClosed ?? false;
  const stats = payrollData?.stats || {
    totalHours: 104.5,
    totalSalary: 2612500,
    daysWorked: 22,
    baseSalary: 2612500,
    hourlyRate: 25000,
    totalAdjustments: 350000,
    adjustments: [
      { id: "1", reason: "Thưởng đóng gói xuất sắc", amount: 200000, date: new Date().toISOString() },
      { id: "2", reason: "Phụ cấp bưng lầu", amount: 150000, date: new Date().toISOString() },
    ],
    dailyDetails: [],
  };

  return (
    <div className="p-3 sm:p-4 pb-24 max-w-md mx-auto w-full space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-orange-100 text-stone-700 cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-base font-bold text-stone-900 tracking-tight flex-1">Chi tiết lương</h1>
        <PayrollExplanationModal />
      </div>

        {/* Period Selector Card */}
        <div className="bg-white p-4 rounded-xl shadow-xs border">
          <label className="text-xs text-muted-foreground font-semibold mb-2 block uppercase tracking-wider">
            Kỳ lương
          </label>
          <PayrollMonthSelector
            current={`${selectedYear}-${selectedMonth}`}
            options={monthOptions}
            onSelect={handleMonthChange}
          />
        </div>

        {/* Main Payroll Container */}
        <div className="bg-white rounded-xl shadow-xs border overflow-hidden">
          <div className="p-4 bg-gray-50/80 border-b flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900 text-sm">Bảng Lương Nhân Viên</p>
              <p className="text-xs text-muted-foreground">Kỳ tháng {selectedMonth}/{selectedYear}</p>
            </div>
            {isClosed ? (
              <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full">
                Đã chốt lương
              </span>
            ) : (
              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
                Tạm tính
              </span>
            )}
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Đang tải dữ liệu kỳ lương...
              </div>
            ) : (
              <PayrollDetailView
                stats={stats}
                monthStr={`${selectedMonth}/${selectedYear}`}
                userName="Bạn"
                isClosed={isClosed}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

export default PayrollView;
