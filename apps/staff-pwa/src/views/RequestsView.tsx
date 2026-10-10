import React from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import RequestListClient from "@/components/requests/RequestListClient";

export const RequestsView: React.FC = () => {
  const { data: response, mutate } = useSWR<{
    success: boolean;
    data: any[];
  }>("/api/staff/requests", fetcher);

  const requests = response?.data || [];

  return (
    <div className="p-3 sm:p-4 pb-24 max-w-md mx-auto w-full select-none">
      <RequestListClient requests={requests} onRefresh={() => mutate()} />
    </div>
  );
};

export default RequestsView;
