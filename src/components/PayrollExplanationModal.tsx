'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

export default function PayrollExplanationModal() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2 text-xs">
                    <HelpCircle className="h-3 w-3" />
                    Công thức tính giờ công
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Cách tính giờ công & lương</DialogTitle>
                    <DialogDescription>
                        Hệ thống tự động tính toán dựa trên giờ Check-in/Check-out và Lịch làm việc.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm mt-4">
                    <div className="grid gap-4 border rounded-lg p-4 bg-slate-50">
                        <h4 className="font-semibold text-slate-900 border-b pb-2">1. Quy tắc Check-in (Vào ca)</h4>
                        <ul className="list-disc pl-5 space-y-2 text-slate-700">
                            <li>
                                <strong>Đến sớm:</strong> Nếu bạn check-in sớm hơn giờ bắt đầu ca làm, giờ công sẽ bắt đầu tính từ 
                                <span className="font-mono bg-slate-200 px-1 rounded ml-1">Giờ Start Đăng Ký</span>.
                            </li>
                            <li>
                                <strong>Đến muộn:</strong> Tính từ giờ thực tế bạn check-in.
                            </li>
                        </ul>

                        <h4 className="font-semibold text-slate-900 border-b pb-2 pt-2">2. Quy tắc Check-out (Tan ca)</h4>
                         <ul className="list-disc pl-5 space-y-2 text-slate-700">
                            <li>
                                <strong>Về sớm (Có lý do):</strong> Nếu bạn về sớm hơn giờ đăng ký và nhập lý do, hệ thống sẽ 
                                <span className="font-mono bg-yellow-100 text-yellow-800 px-1 rounded ml-1">Tạo yêu cầu duyệt</span>. 
                                Khi Admin duyệt, bạn sẽ được tính <span className="font-mono bg-emerald-100 text-emerald-800 px-1 rounded ml-1">Full Giờ</span>. 
                                Nếu chưa duyệt, tính theo giờ thực tế.
                            </li>
                             <li>
                                <strong>Về trễ (Overtime):</strong> Nếu bạn làm quá giờ đăng ký, hệ thống tính đến 
                                <span className="font-mono bg-blue-100 text-blue-800 px-1 rounded ml-1">Giờ thực tế Check-out</span>.
                            </li>
                        </ul>
                         <p className="text-xs text-muted-foreground italic mt-2">
                            * Lưu ý: Giờ công được tính toán dựa trên ca làm việc đã đăng ký trong ngày.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
