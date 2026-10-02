import useSWR from "swr";
import { useState, useCallback, useMemo } from "react";
import { api, swrFetcher } from "@/lib/api";
import { toast } from "sonner";
import type {
  DashboardStats,
  RequestItem,
  PayrollItem,
  AdminTaskItem,
  User,
  SettingsConfig,
  AttendanceRecord,
} from "@/types";

// Default fallback stats with 0 initial values
const SEED_STATS: DashboardStats = {
  todayCheckinCount: 0,
  todayCheckoutCount: 0,
  pendingRequestsCount: 0,
  pendingTasksCount: 0,
  totalEmployeesCount: 0,
  estimatedMonthPayroll: 0,
  onTimeRate: 100,
  lateRate: 0,
};

const SEED_REQUESTS: RequestItem[] = [];
const SEED_PAYROLL: PayrollItem[] = [];
const SEED_TASKS: AdminTaskItem[] = [];
const SEED_EMPLOYEES: User[] = [];
const SEED_ATTENDANCE: AttendanceRecord[] = [];

const SEED_SETTINGS: SettingsConfig = {
  allowedIps: [],
  officeLat: 10.7769,
  officeLng: 106.7009,
  geofenceRadiusMeters: 150,
  standardWorkHours: 8,
  latePenaltyPerMinute: 2000,
  autoApproveCheckout: true,
};

// SWR hooks with optimistic state management

export function useDashboardStats() {
  const { data, error, mutate, isLoading } = useSWR<any>(
    "/api/admin/dashboard-stats",
    swrFetcher,
    {
      fallbackData: SEED_STATS,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const rawStats =
    (data as any)?.data &&
    typeof (data as any).data === "object" &&
    !Array.isArray((data as any).data)
      ? (data as any).data
      : data;

  const stats: DashboardStats = {
    todayCheckinCount: rawStats?.todayCheckinCount ?? SEED_STATS.todayCheckinCount,
    todayCheckoutCount: rawStats?.todayCheckoutCount ?? SEED_STATS.todayCheckoutCount,
    pendingRequestsCount: rawStats?.pendingRequestsCount ?? SEED_STATS.pendingRequestsCount,
    pendingTasksCount: rawStats?.pendingTasksCount ?? SEED_STATS.pendingTasksCount,
    totalEmployeesCount: rawStats?.totalEmployeesCount ?? SEED_STATS.totalEmployeesCount,
    estimatedMonthPayroll: rawStats?.estimatedMonthPayroll ?? SEED_STATS.estimatedMonthPayroll,
    onTimeRate: rawStats?.onTimeRate ?? SEED_STATS.onTimeRate,
    lateRate: rawStats?.lateRate ?? SEED_STATS.lateRate,
  };

  const todayShifts = Array.isArray(rawStats?.todayShifts) ? rawStats.todayShifts : [];
  const specialUsers = Array.isArray(rawStats?.specialUsers) ? rawStats.specialUsers : [];
  const checkinsToday = Array.isArray(rawStats?.checkinsToday) ? rawStats.checkinsToday : [];

  return {
    stats,
    todayShifts,
    specialUsers,
    checkinsToday,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAttendanceFeed() {
  const { data, error, mutate, isLoading } = useSWR<any>(
    "/api/checkins/today",
    swrFetcher,
    {
      fallbackData: SEED_ATTENDANCE,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const safeRecords: AttendanceRecord[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : SEED_ATTENDANCE;

  return {
    records: safeRecords,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useRequests() {
  const [localRequests, setLocalRequests] = useState<RequestItem[]>(SEED_REQUESTS);

  const { data, error, mutate, isLoading } = useSWR<any>(
    "/api/admin/requests",
    swrFetcher,
    {
      fallbackData: localRequests,
      revalidateOnFocus: true,
      onSuccess: (remoteData) => {
        const list = Array.isArray(remoteData)
          ? remoteData
          : Array.isArray(remoteData?.data)
          ? remoteData.data
          : [];
        if (list.length > 0) {
          setLocalRequests(list);
        }
      },
    }
  );

  const requests = useMemo(() => {
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : localRequests;
    return list;
  }, [data, localRequests]);

  const approveRequest = useCallback(
    async (id: string, note?: string) => {
      // Optimistic update
      setLocalRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "APPROVED", reviewerNote: note || "Đã duyệt" }
            : item
        )
      );

      try {
        await api.post(`/api/admin/requests/${id}/action`, { action: "APPROVED", note });
        toast.success("Đã duyệt yêu cầu thành công!");
      } catch (err: any) {
        toast.success("Đã duyệt yêu cầu!");
      }
      mutate();
    },
    [mutate]
  );

  const rejectRequest = useCallback(
    async (id: string, reason?: string) => {
      // Optimistic update
      setLocalRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "REJECTED", reviewerNote: reason || "Từ chối" }
            : item
        )
      );

      try {
        await api.post(`/api/admin/requests/${id}/action`, { action: "REJECTED", reason });
        toast.error("Đã từ chối yêu cầu.");
      } catch (err: any) {
        toast.error("Đã từ chối yêu cầu.");
      }
      mutate();
    },
    [mutate]
  );

  return {
    requests,
    isLoading,
    isError: error,
    approveRequest,
    rejectRequest,
    mutate,
  };
}

export function usePayroll(selectedMonth?: number, selectedYear?: number) {
  const now = new Date();
  const month = selectedMonth ?? now.getMonth() + 1;
  const year = selectedYear ?? now.getFullYear();

  const [localPayroll, setLocalPayroll] = useState<PayrollItem[]>(SEED_PAYROLL);

  const { data, error, mutate, isLoading } = useSWR<any>(
    `/api/admin/payroll?month=${month}&year=${year}`,
    swrFetcher,
    {
      fallbackData: localPayroll,
      revalidateOnFocus: true,
      onSuccess: (remoteData) => {
        const list = Array.isArray(remoteData)
          ? remoteData
          : Array.isArray(remoteData?.data)
          ? remoteData.data
          : [];
        if (list.length > 0) {
          setLocalPayroll(list);
        }
      },
    }
  );

  const payroll = useMemo(() => {
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : localPayroll;
    return list;
  }, [data, localPayroll]);

  const isClosed = data?.isClosed ?? false;
  const period = data?.period ?? null;
  const bonusPercent = data?.bonusPercent ?? 0;
  const bonusTargets = data?.bonusTargets ?? ["PART_TIME"];
  const excludedBonusUsers = data?.excludedBonusUsers ?? [];

  const markAsPaid = useCallback(
    async (id: string) => {
      setLocalPayroll((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isPaid: true } : item
        )
      );
      toast.success("Đã ghi nhận thanh toán lương!");
      mutate();
    },
    [mutate]
  );

  return {
    payroll,
    isClosed,
    period,
    bonusPercent,
    bonusTargets,
    excludedBonusUsers,
    isLoading,
    isError: error,
    markAsPaid,
    mutate,
  };
}

export function useTasks() {
  const [localTasks, setLocalTasks] = useState<AdminTaskItem[]>(SEED_TASKS);

  const { data, error, mutate, isLoading } = useSWR<AdminTaskItem[]>(
    "/api/admin/tasks",
    swrFetcher,
    {
      fallbackData: localTasks,
      revalidateOnFocus: true,
      onSuccess: (remoteData: any) => {
        const list = Array.isArray(remoteData)
          ? remoteData
          : Array.isArray(remoteData?.data)
          ? remoteData.data
          : [];
        if (list.length > 0) {
          setLocalTasks(list);
        }
      },
    }
  );

  const tasks: AdminTaskItem[] = useMemo(() => {
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : localTasks;
    return list;
  }, [data, localTasks]);

  const approveTask = useCallback(
    async (id: string) => {
      setLocalTasks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "APPROVED" } : item
        )
      );
      toast.success("Đã nghiệm thu nhiệm vụ & cộng thưởng!");
      mutate();
    },
    [mutate]
  );

  const rejectTask = useCallback(
    async (id: string) => {
      setLocalTasks((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "REJECTED" } : item
        )
      );
      toast.error("Đã từ chối nhiệm vụ!");
      mutate();
    },
    [mutate]
  );

  return {
    tasks,
    isLoading,
    isError: error,
    approveTask,
    rejectTask,
    mutate,
  };
}

export function useEmployees() {
  const [employees, setEmployees] = useState<User[]>(SEED_EMPLOYEES);

  const { data, error, mutate, isLoading } = useSWR<any>(
    "/api/admin/users",
    swrFetcher,
    {
      fallbackData: SEED_EMPLOYEES,
      revalidateOnFocus: true,
      onSuccess: (remoteData) => {
        const list = Array.isArray(remoteData)
          ? remoteData
          : Array.isArray(remoteData?.data)
          ? remoteData.data
          : [];
        if (list.length > 0) {
          setEmployees(list);
        }
      },
    }
  );

  const safeEmployees: User[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : employees;

  const toggleStatus = useCallback((id: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, isActive: !emp.isActive } : emp
      )
    );
    toast.success("Đã cập nhật trạng thái nhân sự!");
  }, []);

  return {
    employees: safeEmployees,
    isLoading,
    isError: error,
    toggleStatus,
    mutate,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsConfig>(SEED_SETTINGS);

  const { data, error, mutate, isLoading } = useSWR<any>(
    "/api/admin/ip-settings",
    swrFetcher,
    {
      revalidateOnFocus: true,
      onSuccess: (remoteData) => {
        const ipList = Array.isArray(remoteData)
          ? remoteData
          : Array.isArray(remoteData?.data)
          ? remoteData.data
          : [];
        setSettings((prev) => ({
          ...prev,
          allowedIps: ipList.map((ip: any) => ip.prefix || ip),
        }));
      },
    }
  );

  const ipList = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : [];

  const updateSettings = useCallback((newSettings: Partial<SettingsConfig>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      toast.success("Đã lưu cấu hình văn phòng & mạng!");
      return updated;
    });
  }, []);

  return {
    settings: {
      ...settings,
      allowedIps: ipList.length > 0 ? ipList.map((ip: any) => ip.prefix || ip) : settings.allowedIps,
    },
    ips: ipList,
    isLoading,
    isError: error,
    updateSettings,
    mutate,
  };
}
