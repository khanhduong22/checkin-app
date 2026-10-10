import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface BulkSendPayslipButtonProps {
  month: number;
  year: number;
  isClosed: boolean;
  payslipCount: number;
  onSuccess?: () => void;
}

export function BulkSendPayslipButton({
  month,
  year,
  isClosed,
  payslipCount,
  onSuccess,
}: BulkSendPayslipButtonProps) {
  const [sending, setSending] = useState(false);

  async function handleBulkSend() {
    if (!isClosed) {
      toast.error("Cần chốt bảng lương tháng này trước");
      return;
    }
    if (
      !confirm(
        `Gửi email phiếu lương tháng ${month}/${year} cho ${payslipCount} nhân viên?\n\nThao tác này có thể mất vài giây.`
      )
    ) {
      return;
    }

    setSending(true);
    const toastId = toast.loading(`Đang gửi email cho ${payslipCount} nhân viên...`);

    try {
      const res = await api.post<any>("/api/admin/payroll/email-all", {
        month,
        year,
      });
      toast.dismiss(toastId);

      const data = res?.data || res;
      if (res?.success || data?.sent !== undefined) {
        const sent = data?.sent ?? 0;
        const failed = data?.failed ?? 0;
        const errors = data?.errors ?? [];

        if (failed === 0) {
          toast.success(`✅ Đã gửi thành công cho ${sent} nhân viên!`);
        } else {
          toast.warning(
            `Gửi ${sent}/${sent + failed} — ${failed} thất bại:\n${errors.join(", ")}`
          );
        }
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.error || "Gửi thất bại");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Lỗi kết nối");
    } finally {
      setSending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleBulkSend}
      disabled={sending || !isClosed || payslipCount === 0}
      title={
        !isClosed
          ? "Cần chốt bảng lương trước"
          : `Gửi email cho ${payslipCount} nhân viên`
      }
      className="text-xs sm:text-sm text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
    >
      {sending ? (
        <>
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          Đang gửi...
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 mr-1.5" />
          📧 Gửi phiếu lương ({payslipCount})
        </>
      )}
    </Button>
  );
}
