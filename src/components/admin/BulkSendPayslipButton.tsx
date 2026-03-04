"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { sendAllPayslipEmailsAction } from "@/actions/payslip-email-actions";
import { toast } from "sonner";

interface BulkSendPayslipButtonProps {
  month: number;
  year: number;
  isClosed: boolean;
  payslipCount: number;
}

export function BulkSendPayslipButton({ month, year, isClosed, payslipCount }: BulkSendPayslipButtonProps) {
  const [sending, setSending] = useState(false);

  async function handleBulkSend() {
    if (!isClosed) {
      toast.error("Cần chốt bảng lương tháng này trước");
      return;
    }
    if (!confirm(`Gửi email phiếu lương tháng ${month}/${year} cho ${payslipCount} nhân viên?\n\nThao tác này có thể mất vài giây.`)) return;

    setSending(true);
    const toastId = toast.loading(`Đang gửi email cho ${payslipCount} nhân viên...`);

    try {
      const res = await sendAllPayslipEmailsAction(month, year);
      toast.dismiss(toastId);

      if (res.success && res.data) {
        const { sent, failed, errors } = res.data;
        if (failed === 0) {
          toast.success(`✅ Đã gửi thành công cho ${sent} nhân viên!`);
        } else {
          toast.warning(`Gửi ${sent}/${sent + failed} — ${failed} thất bại:\n${errors.join(", ")}`);
        }
      } else {
        toast.error(res.error || "Gửi thất bại");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Lỗi kết nối");
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
      title={!isClosed ? "Cần chốt bảng lương trước" : `Gửi email cho ${payslipCount} nhân viên`}
    >
      {sending
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang gửi...</>
        : <><Mail className="h-4 w-4 mr-2" />📧 Gửi phiếu lương ({payslipCount})</>}
    </Button>
  );
}
