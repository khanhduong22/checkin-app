import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export default function PayrollExplanationModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer">
          <HelpCircle className="h-3.5 w-3.5" />
          Cách tính giờ công
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Cách tính giờ công & lương</DialogTitle>
          <DialogDescription className="text-xs">
            Hệ thống tự động tính toán dựa trên giờ Check-in/Check-out và Lịch làm việc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs mt-2">
          <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 border-b pb-1">1. Quy tắc Check-in (Vào ca)</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li>
                <strong>Đến sớm:</strong> Giờ công bắt đầu tính từ giờ Start đã đăng ký của ca.
              </li>
              <li>
                <strong>Đến muộn:</strong> Tính từ giờ thực tế bạn check-in.
              </li>
            </ul>

            <h4 className="font-bold text-slate-900 border-b pb-1 pt-2">2. Quy tắc Check-out (Tan ca)</h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              <li>
                <strong>Về sớm:</strong> Cần nhập lý do để tạo yêu cầu duyệt.
              </li>
              <li>
                <strong>Làm thêm giờ:</strong> Hệ thống ghi nhận theo giờ thực tế check-out.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
