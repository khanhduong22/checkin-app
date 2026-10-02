import React, { useState } from "react";
import PayrollAdminClient from "@/components/admin/PayrollAdminClient";
import { usePayroll } from "@/hooks/useAdminData";

export function PayrollPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const {
    payroll,
    isClosed,
    bonusPercent,
    bonusTargets,
    excludedBonusUsers,
    mutate,
  } = usePayroll(selectedMonth, selectedYear);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Bảng Lương
          </h2>
          <p className="text-sm text-muted-foreground">
            Bảng tổng hợp công, mức lương cơ bản, % thưởng tháng và xuất file Excel
          </p>
        </div>
      </div>

      <PayrollAdminClient
        data={payroll}
        month={selectedMonth}
        year={selectedYear}
        isClosed={isClosed}
        initialBonusPercent={bonusPercent}
        initialBonusTargets={bonusTargets}
        initialExcludedUsers={excludedBonusUsers}
        onMonthChange={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
        onRefresh={mutate}
      />
    </div>
  );
}
