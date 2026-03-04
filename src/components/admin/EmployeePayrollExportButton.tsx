'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportSingleEmployeeXLSX, type PayrollExportUser } from "@/lib/payrollExport";

interface Props {
  user: PayrollExportUser;
  month: number;
  year: number;
  isClosed?: boolean;
}

export default function EmployeePayrollExportButton({ user, month, year, isClosed = false }: Props) {
  const handleExport = () => {
    exportSingleEmployeeXLSX(user, month, year, isClosed);
  };

  return (
    <Button variant="outline" onClick={handleExport} className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
      <Download className="h-4 w-4 mr-2" />
      Xuất Phiếu Lương
    </Button>
  );
}
