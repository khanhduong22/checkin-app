import React from "react";
import IPManager from "@/components/admin/IPManager";
import HolidayManager from "@/components/admin/HolidayManager";
import BackupManager from "@/components/admin/BackupManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useAdminData";

export function SettingsPage() {
  const { settings } = useSettings();

  const ips = (settings?.allowedIps || []).map((prefix: string, i: number) => ({
    id: i + 1,
    prefix,
    label: "IP Cho phép",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Cấu hình Hệ thống
        </h2>
        <p className="text-sm text-muted-foreground">
          Quản lý dải IP văn phòng được phép chấm công, cấu hình ngày lễ và sao lưu dữ liệu
        </p>
      </div>

      <Tabs defaultValue="access" className="space-y-4">
        <TabsList className="bg-white border">
          <TabsTrigger value="access">Truy cập & Bảo mật (IP)</TabsTrigger>
          <TabsTrigger value="holidays">Ngày Lễ & Lương</TabsTrigger>
          <TabsTrigger value="backup">Sao lưu & Dữ liệu</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="space-y-4">
          <IPManager ips={ips} />
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <HolidayManager />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <BackupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
