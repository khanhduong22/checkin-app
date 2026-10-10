import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export interface SendPayslipButtonProps {
  userId: string;
  month: number;
  year: number;
  emailSentAt?: Date | string | null;
  hasPayslip: boolean;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function SendPayslipButton({
  userId,
  month,
  year,
  emailSentAt,
  hasPayslip,
  onSuccess,
  variant = "outline",
  size = "sm",
}: SendPayslipButtonProps) {
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(
    emailSentAt ? new Date(emailSentAt) : null
  );

  useEffect(() => {
    setSentAt(emailSentAt ? new Date(emailSentAt) : null);
  }, [emailSentAt]);

  async function handleSend() {
    if (!hasPayslip) {
      toast.error("Cần chốt bảng lương trước khi gửi email");
      return;
    }
    if (
      !confirm(
        `Gửi phiếu lương tháng ${month}/${year} cho nhân viên này?`
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await api.post<any>(`/api/admin/payroll/email/${userId}`, {
        month,
        year,
      });
      if (res?.success) {
        const now = new Date();
        setSentAt(now);
        toast.success("✅ Đã gửi phiếu lương thành công!");
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.error || "Gửi thất bại");
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối");
    } finally {
      setSending(false);
    }
  }

  if (sentAt) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
        <span className="text-[11px] text-green-600 font-medium whitespace-nowrap">
          Đã gửi {format(sentAt, "HH:mm dd/MM")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground px-2 hover:text-slate-900"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Gửi lại
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSend}
      disabled={sending || !hasPayslip}
      title={
        !hasPayslip
          ? "Cần chốt bảng lương trước"
          : "Gửi phiếu lương qua email"
      }
      className="gap-1.5 text-xs"
    >
      {sending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          Đang gửi...
        </>
      ) : (
        <>
          <Mail className="h-3.5 w-3.5 mr-1" />
          Gửi phiếu lương
        </>
      )}
    </Button>
  );
}
