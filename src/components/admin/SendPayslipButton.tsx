"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { sendPayslipEmailAction } from "@/actions/payslip-email-actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface SendPayslipButtonProps {
  userId: string;
  month: number;
  year: number;
  emailSentAt?: Date | string | null;
  hasPayslip: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function SendPayslipButton({ userId, month, year, emailSentAt, hasPayslip, variant = "outline", size = "sm" }: SendPayslipButtonProps) {
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(emailSentAt ? new Date(emailSentAt) : null);

  async function handleSend() {
    if (!hasPayslip) {
      toast.error("Cần chốt bảng lương trước khi gửi email");
      return;
    }
    if (!confirm(`Gửi phiếu lương tháng ${month}/${year} cho nhân viên này?`)) return;

    setSending(true);
    try {
      const res = await sendPayslipEmailAction(userId, month, year);
      if (res.success) {
        setSentAt(new Date());
        toast.success("✅ Đã gửi phiếu lương thành công!");
      } else {
        toast.error(res.error || "Gửi thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setSending(false);
    }
  }

  if (sentAt) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
        <span className="text-[11px] text-green-600 font-medium">
          Đã gửi {format(sentAt, "HH:mm dd/MM")}
        </span>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground px-1.5" onClick={handleSend} disabled={sending}>
          Gửi lại
        </Button>
      </div>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleSend} disabled={sending || !hasPayslip}
      title={!hasPayslip ? "Cần chốt bảng lương trước" : "Gửi phiếu lương qua email"}>
      {sending
        ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Đang gửi...</>
        : <><Mail className="h-3.5 w-3.5 mr-1" /> Gửi phiếu lương</>}
    </Button>
  );
}
