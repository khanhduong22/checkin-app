import React from "react";
import RequestAdminClient from "@/components/admin/RequestAdminClient";
import { useRequests } from "@/hooks/useAdminData";

export function RequestsPage() {
  const { requests, mutate } = useRequests();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Duyệt yêu cầu nhân sự
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Danh sách đơn xin nghỉ phép, làm việc tại nhà (WFH), và giải trình chấm công
          </p>
        </div>
      </div>

      <RequestAdminClient requests={requests} onRefresh={mutate} />
    </div>
  );
}
