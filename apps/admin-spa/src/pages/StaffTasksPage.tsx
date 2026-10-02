import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckSquare, Target, Award, ArrowRight } from "lucide-react";

export function StaffTasksPage() {
  const handleOpenStaffPortal = () => {
    window.location.href = "/staff-tasks";
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-100 flex items-center justify-center text-3xl shadow-sm">
          📋
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Công việc & KPI Nhân Sự
        </h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Hệ thống giao việc, chấm điểm KPI, quản lý công việc WFH và danh mục nhiệm vụ dành cho toàn bộ nhân viên LimArt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-orange-100 bg-orange-50/40">
          <CardHeader className="pb-3">
            <CheckSquare className="w-6 h-6 text-orange-600 mb-1" />
            <CardTitle className="text-base text-slate-900">Giao việc nhân viên</CardTitle>
            <CardDescription className="text-xs">
              Tạo và phân bổ đầu việc hàng ngày cho các ca trực
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <Target className="w-6 h-6 text-emerald-600 mb-1" />
            <CardTitle className="text-base text-slate-900">Bảng theo dõi KPI</CardTitle>
            <CardDescription className="text-xs">
              Theo dõi tiến độ hoàn thành chỉ tiêu doanh thu & đơn hàng
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-blue-100 bg-blue-50/40">
          <CardHeader className="pb-3">
            <Award className="w-6 h-6 text-blue-600 mb-1" />
            <CardTitle className="text-base text-slate-900">Nghiệm thu đóng gói</CardTitle>
            <CardDescription className="text-xs">
              Duyệt điểm đóng gói bưng hàng để tính thưởng cuối tháng
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="border shadow-sm bg-white p-6 text-center space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">
            Cổng quản lý công việc toàn diện
          </h3>
          <p className="text-sm text-muted-foreground">
            Bấm nút bên dưới để chuyển trực tiếp đến giao diện làm việc của phân hệ Tasks & KPI.
          </p>
        </div>
        <div>
          <Button
            size="lg"
            onClick={handleOpenStaffPortal}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 shadow-sm"
          >
            Mở Trang Công việc & KPI <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
