"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPayslipEmail } from "@/lib/email";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

/** Send payslip email for one employee for a given month/year */
export async function sendPayslipEmailAction(userId: string, month: number, year: number) {
  try {
    await requireAdmin();

    const payslip = await prisma.payslip.findUnique({
      where: { userId_month_year: { userId, month, year } },
      include: { user: true },
    });

    if (!payslip) return { success: false, error: "Payslip chưa được chốt. Cần chốt bảng lương trước." };
    if (!payslip.user.email) return { success: false, error: "Nhân viên chưa có email." };

    const content = payslip.content as any;

    await sendPayslipEmail({
      employeeName: payslip.user.name ?? "Nhân viên",
      employeeEmail: payslip.user.email,
      month,
      year,
      stats: {
        totalHours: content?.totalHours,
        hourlyRate: content?.hourlyRate,
        monthlySalary: content?.monthlySalary,
        employmentType: content?.employmentType,
        totalTaskIncome: content?.totalTaskIncome,
        totalAdjustments: content?.totalAdjustments,
        netSalary: payslip.netSalary,
        bonusAmount: content?.bonusAmount,
        lateCount: content?.lateCount,
        latePenaltyHours: content?.latePenaltyHours,
        latePenaltyAmount: content?.latePenaltyAmount,
      },
    });

    await prisma.payslip.update({
      where: { userId_month_year: { userId, month, year } },
      data: { emailSentAt: new Date() },
    });

    revalidatePath("/admin/payroll");
    revalidatePath(`/admin/payroll/${userId}`);
    return { success: true };
  } catch (e: any) {
    console.error("sendPayslipEmailAction error:", e);
    return { success: false, error: e.message || "Gửi email thất bại" };
  }
}

/** Bulk send payslip emails for all employees for a given month/year */
export async function sendAllPayslipEmailsAction(month: number, year: number) {
  try {
    await requireAdmin();

    const payslips = await prisma.payslip.findMany({
      where: { month, year },
      include: { user: true },
    });

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const payslip of payslips) {
      if (!payslip.user.email) {
        results.failed++;
        results.errors.push(`${payslip.user.name}: không có email`);
        continue;
      }

      try {
        const content = payslip.content as any;
        await sendPayslipEmail({
          employeeName: payslip.user.name ?? "Nhân viên",
          employeeEmail: payslip.user.email,
          month,
          year,
          stats: {
            totalHours: content?.totalHours,
            hourlyRate: content?.hourlyRate,
            monthlySalary: content?.monthlySalary,
            employmentType: content?.employmentType,
            totalTaskIncome: content?.totalTaskIncome,
            totalAdjustments: content?.totalAdjustments,
            netSalary: payslip.netSalary,
            bonusAmount: content?.bonusAmount,
            lateCount: content?.lateCount,
            latePenaltyHours: content?.latePenaltyHours,
            latePenaltyAmount: content?.latePenaltyAmount,
          },
        });

        await prisma.payslip.update({
          where: { id: payslip.id },
          data: { emailSentAt: new Date() },
        });

        results.sent++;
        // Small rate limit — avoid overwhelming Resend
        await new Promise((r) => setTimeout(r, 300));
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${payslip.user.name}: ${e.message}`);
      }
    }

    revalidatePath("/admin/payroll");
    return { success: true, data: results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/** Get email sent status for payslips in a month */
export async function getPayslipEmailStatus(month: number, year: number) {
  try {
    const payslips = await prisma.payslip.findMany({
      where: { month, year },
      select: { userId: true, emailSentAt: true },
    });
    const map: Record<string, Date | null> = {};
    for (const p of payslips) map[p.userId] = p.emailSentAt;
    return { success: true, data: map };
  } catch {
    return { success: false, data: {} };
  }
}
