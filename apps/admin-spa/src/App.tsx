import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SWRConfig } from "swr";
import { swrFetcher } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { PayrollPage } from "@/pages/PayrollPage";
import { TasksPage } from "@/pages/TasksPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AuditLogPage } from "@/pages/AuditLogPage";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { LuckyWheelPage } from "@/pages/LuckyWheelPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { ManagerTasksPage } from "@/pages/ManagerTasksPage";
import { StaffTasksPage } from "@/pages/StaffTasksPage";
import { HelpPage } from "@/pages/HelpPage";
import { EmployeeDetailPage } from "@/pages/EmployeeDetailPage";
import { EmployeePayrollPage } from "@/pages/EmployeePayrollPage";
import { ChangelogPage } from "@/pages/ChangelogPage";

export default function App() {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
      }}
    >
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/:id" element={<EmployeeDetailPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="payroll/:userId" element={<EmployeePayrollPage />} />
            <Route path="changelog" element={<ChangelogPage />} />
            <Route path="lucky-wheel" element={<LuckyWheelPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="manager-tasks" element={<ManagerTasksPage />} />
            <Route path="staff-tasks" element={<StaffTasksPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit-logs" element={<AuditLogPage />} />
            <Route path="audit" element={<Navigate to="/audit-logs" replace />} />
            <Route path="help" element={<HelpPage />} />
            {/* Catch-all route redirects to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SWRConfig>
  );
}
