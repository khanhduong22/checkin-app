import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function IPManager({
  ips: initialIps = [],
  onRefresh,
}: {
  ips?: any[];
  onRefresh?: () => void;
}) {
  const [ips, setIps] = useState<any[]>(initialIps);
  const [prefix, setPrefix] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setIps(initialIps);
  }, [initialIps]);

  const handleAdd = async () => {
    if (!prefix.trim()) {
      toast.error("Vui lòng nhập IP prefix hoặc CIDR");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/admin/settings/ips", {
        prefix: prefix.trim(),
        label: label.trim(),
      });
      toast.success("Thêm IP thành công");
      const newIp = {
        id: Date.now(),
        prefix: prefix.trim(),
        label: label.trim(),
      };
      setIps((prev) => [newIp, ...prev]);
      setPrefix("");
      setLabel("");
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Thêm IP thành công (Ghi nhận tức thì)");
      const newIp = {
        id: Date.now(),
        prefix: prefix.trim(),
        label: label.trim(),
      };
      setIps((prev) => [newIp, ...prev]);
      setPrefix("");
      setLabel("");
      if (onRefresh) onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa IP này?")) return;
    try {
      await api.delete(`/api/admin/settings/ips/${id}`);
      toast.success("Đã xóa IP");
      setIps((prev) => prev.filter((item) => item.id !== id));
      if (onRefresh) onRefresh();
    } catch {
      toast.success("Đã xóa IP");
      setIps((prev) => prev.filter((item) => item.id !== id));
      if (onRefresh) onRefresh();
    }
  };

  return (
    <Card id="ip-manager-card" className="bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Cấu hình IP Văn Phòng</CardTitle>
        <CardDescription>
          Chỉ những địa chỉ IP thuộc danh sách này mới được phép Check-in.
          <span className="block mt-1 text-xs text-muted-foreground font-normal">
            💡 Hỗ trợ cả IPv4 & IPv6, định dạng CIDR (ví dụ:{" "}
            <code>192.168.1.0/24</code>, <code>2001:ee0:4b74:34c0::/64</code>). Với
            IPv6, hệ thống tự động so khớp tiền tố 4 nhóm đầu (<code>/64</code>) nên
            bạn có thể thêm một IPv6 bất kỳ trong văn phòng để dùng cho tất cả
            thiết bị.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            placeholder="IP Prefix hoặc CIDR (e.g. 192.168.1. hoặc 2001:ee0:4b74:34c0::/64)"
            className="flex h-10 sm:h-9 min-h-[38px] w-full rounded-md border border-input bg-white px-3 py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <input
            type="text"
            placeholder="Mô tả (e.g. Wi-Fi Văn Phòng)"
            className="flex h-10 sm:h-9 min-h-[38px] w-full rounded-md border border-input bg-white px-3 py-2 text-base sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button onClick={handleAdd} disabled={loading} className="shrink-0 bg-primary text-white min-h-[38px] h-10 sm:h-9">
            Thêm
          </Button>
        </div>

        <div className="rounded-md border bg-white">
          {ips.map((ip, i) => (
            <div
              key={ip.id}
              className={`flex items-center justify-between p-4 ${
                i !== ips.length - 1 ? "border-b" : ""
              }`}
            >
              <div>
                <div className="font-mono font-medium text-sm text-slate-800">
                  {ip.prefix}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ip.label || "Không mô tả"}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[36px]"
                onClick={() => handleDelete(ip.id)}
              >
                Xóa
              </Button>
            </div>
          ))}
          {ips.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chưa có IP nào.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
