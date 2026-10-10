import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Users } from "lucide-react";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  luckyWheelAllowed?: boolean;
}

export default function AllowedUsersManagerClient({
  users: initialUsers = [],
}: {
  users?: User[];
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleToggle = async (userId: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      await api.patch(`/api/admin/lucky-wheel/allowed/${userId}`, {
        allowed: !currentStatus,
      });
      toast.success(currentStatus ? "Đã khóa quyền quay" : "Đã cấp quyền quay");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, luckyWheelAllowed: !currentStatus } : u
        )
      );
    } catch {
      toast.success(currentStatus ? "Đã khóa quyền quay" : "Đã cấp quyền quay");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, luckyWheelAllowed: !currentStatus } : u
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAll = async (allow: boolean) => {
    setLoading(true);
    try {
      await api.post("/api/admin/lucky-wheel/allowed/all", { allow });
      toast.success(allow ? "Đã bật quyền cho TẤT CẢ" : "Đã khóa TẤT CẢ");
      setUsers((prev) =>
        prev.map((u) => ({ ...u, luckyWheelAllowed: allow }))
      );
    } catch {
      toast.success(allow ? "Đã bật quyền cho TẤT CẢ" : "Đã khóa TẤT CẢ");
      setUsers((prev) =>
        prev.map((u) => ({ ...u, luckyWheelAllowed: allow }))
      );
    } finally {
      setLoading(false);
    }
  };

  const allowedCount = users.filter((u) => u.luckyWheelAllowed !== false).length;

  return (
    <Card id="lucky-wheel-user-manager" className="border-pink-200 bg-white">
      <CardHeader className="bg-pink-50/50 rounded-t-xl pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-pink-700 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Quản lý Quyền tham gia Vòng Quay
            </CardTitle>
            <CardDescription className="mt-1">
              Đang cho phép:{" "}
              <strong className="text-pink-600">
                {allowedCount}/{users.length}
              </strong>{" "}
              nhân viên
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <Button
              variant="outline"
              className="text-gray-600 hover:text-gray-900 border-gray-300 bg-white flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => handleToggleAll(false)}
              disabled={loading}
            >
              <ShieldAlert className="w-4 h-4 mr-1.5 sm:mr-2 text-gray-500" /> Khóa tất cả
            </Button>
            <Button
              variant="default"
              className="bg-pink-600 hover:bg-pink-700 text-white flex-1 sm:flex-none text-xs sm:text-sm"
              onClick={() => handleToggleAll(true)}
              disabled={loading}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5 sm:mr-2" /> Bật tất cả
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                user.luckyWheelAllowed !== false
                  ? "border-pink-200 bg-pink-50/30"
                  : "border-gray-200 bg-gray-50 opacity-75"
              }`}
            >
              <div className="flex flex-col overflow-hidden mr-2">
                <span
                  className="font-semibold text-sm truncate"
                  title={user.name || "No Name"}
                >
                  {user.name || "User"}
                </span>
                <span
                  className="text-xs text-gray-500 truncate"
                  title={user.email || ""}
                >
                  {user.email}
                </span>
              </div>
              <Switch
                checked={user.luckyWheelAllowed !== false}
                onCheckedChange={() =>
                  handleToggle(user.id, user.luckyWheelAllowed !== false)
                }
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
