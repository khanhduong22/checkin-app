import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Medal, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RewardsPage() {
    return (
        <main className="min-h-screen bg-gray-50 p-4 flex justify-center">
             <div className="w-full max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                     <div>
                        <h1 className="text-2xl font-bold">Chính sách Thưởng / Phạt</h1>
                        <p className="text-muted-foreground text-sm">Cập nhật mới nhất T1/2026</p>
                     </div>
                     <a href="/">
                        <Button variant="outline" size="sm">← Trang chủ</Button>
                     </a>
                </div>

                {/* REWARDS */}
                <Card className="border-orange-200 bg-gradient-to-br from-white to-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                             <Flame className="fill-orange-500 text-orange-600" />
                             Hệ Thống Streak (Chuỗi Bất Bại)
                        </CardTitle>
                        <CardDescription>
                            Đi làm đúng giờ liên tục để nhận thưởng nóng.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-orange-100">
                             <div className="flex items-center gap-3">
                                 <div className="bg-orange-100 p-2 rounded-full font-bold text-orange-600">7🔥</div>
                                 <div className="font-medium">Chuỗi 7 ngày</div>
                             </div>
                             <Badge variant="secondary" className="bg-orange-100 text-orange-700">Thưởng 50k</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-orange-100">
                             <div className="flex items-center gap-3">
                                 <div className="bg-red-100 p-2 rounded-full font-bold text-red-600">30🔥</div>
                                 <div className="font-medium">Chuỗi 30 ngày</div>
                             </div>
                             <Badge variant="secondary" className="bg-red-100 text-red-700">Thưởng 200k + Vinh danh</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600">
                             <Medal className="text-blue-600" />
                             Top Nhân Viên Xuất Sắc
                        </CardTitle>
                        <CardDescription>
                            Xếp hạng dựa trên tổng giờ làm và số lỗi vi phạm.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-blue-100">
                             <div className="flex items-center gap-3">
                                 <div className="bg-yellow-100 p-2 rounded-full font-bold text-yellow-600">🥇</div>
                                 <div className="font-medium">Top 1 Giờ làm việc</div>
                             </div>
                             <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Thưởng 500k</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-blue-100">
                             <div className="flex items-center gap-3">
                                 <div className="bg-blue-100 p-2 rounded-full font-bold text-blue-600">🌥️</div>
                                 <div className="font-medium">Early Bird (Đi sớm nhất)</div>
                             </div>
                             <Badge variant="secondary" className="bg-blue-100 text-blue-700">Thưởng 100k</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* PENALTIES */}
                <Card className="border-red-200 shadow-md">
                     <CardHeader className="bg-red-50/50 border-b">
                        <CardTitle className="flex items-center gap-2 text-red-700">
                             <AlertTriangle className="text-red-600" />
                             Quy Định Xử Phạt
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                         <div className="flex items-center justify-between">
                             <span className="font-medium text-gray-700">Đi muộn (sau 08:30)</span>
                             <span className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded">-50k / lần</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <span className="font-medium text-gray-700">Về sớm (trước 17:30)</span>
                             <span className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded">-50k / lần</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <span className="font-medium text-gray-700">Quên Check-in/out</span>
                             <span className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded">-20k / lần</span>
                         </div>
                         
                         <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-muted-foreground italic border">
                            * Lưu ý: Nếu có lý do chính đáng, vui lòng gửi Yêu cầu giải trình trong mục "Xin giải trình/Nghỉ phép" để được Admin xem xét xóa lỗi.
                         </div>
                    </CardContent>
                </Card>

             </div>
        </main>
    );
}
