'use server';

import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/lib/payroll";
import { revalidatePath } from "next/cache";
export async function addAdjustment(userId: string, amount: number, reason: string) {
  try {
    const result = await prisma.payrollAdjustment.create({
      data: {
        userId,
        amount,
        reason
      }
    });

    revalidatePath('/admin/payroll');
    revalidatePath('/'); // Update user homepage
    
    return { success: true };
  } catch (error: any) {
    console.error(`[addAdjustment] Server Action Error: `, error);
    // Instead of throwing an error that Next.js might fail to serialize or catch correctly,
    // we return a standard object that the client can parse.
    return { success: false, error: "Lỗi hệ thống: " + (error?.message || "Không thể thực hiện lưu.") };
  }
}

import { EmploymentType } from "@prisma/client";

export async function closePayrollMonth(month: number, year: number, bonusPercent: number, targets: EmploymentType[] = ['PART_TIME'], excludedBonusUsers: string[] = []) {
  // 1. Calculate stats using optimized batch calculatePayroll
  const payrollData = await calculatePayroll(month, year);

  // 2. Build snapshots
  const snapshots = payrollData.map((p) => {
    // Calculate Final Net with Bonus
    const isThuKpiSalary = (p.email === 'cuccung123456789@gmail.com' || p.name === 'Thư') && (year > 2026 || (year === 2026 && month >= 6));
    const shouldApplyBonus = (targets.includes(p.employmentType) || (isThuKpiSalary && targets.includes('PART_TIME'))) && !excludedBonusUsers.includes(p.id);
    const bonusAmount = shouldApplyBonus ? p.baseSalary * (bonusPercent / 100) : 0;
    const finalNet = p.totalSalary + bonusAmount;

    // Destructure to extract stats (excluding user metadata fields)
    const { id, name, email, role, ...stats } = p;

    return {
      userId: p.id,
      content: {
        ...stats,
        bonusPercent: shouldApplyBonus ? bonusPercent : 0,
        bonusAmount,
        finalNet
      },
      netSalary: finalNet,
      month,
      year
    };
  });

  // 3. Save to DB
  await prisma.$transaction(async (tx) => {
    // Create/Update Period
    await tx.payrollPeriod.upsert({
      where: { month_year: { month, year } },
      create: { month, year, status: 'CLOSED', bonusPercent, bonusTargets: targets, excludedBonusUsers },
      update: { status: 'CLOSED', bonusPercent, bonusTargets: targets, excludedBonusUsers }
    });

    // Create/Update Payslips
    for (const s of snapshots) {
      await tx.payslip.upsert({
        where: { userId_month_year: { userId: s.userId, month, year } },
        create: {
          userId: s.userId,
          month,
          year,
          content: s.content as any,
          netSalary: s.netSalary,
          status: 'PENDING'
        },
        update: {
          content: s.content as any,
          netSalary: s.netSalary
        }
      });
    }
  });

  revalidatePath('/admin/payroll');
  return { success: true };
}

export async function updatePayrollBonus(month: number, year: number, bonusPercent: number, targets: EmploymentType[] = ['PART_TIME'], excludedBonusUsers: string[] = []) {
  await prisma.payrollPeriod.upsert({
    where: { month_year: { month, year } },
    create: { month, year, bonusPercent, bonusTargets: targets, excludedBonusUsers },
    update: { bonusPercent, bonusTargets: targets, excludedBonusUsers }
  });
  revalidatePath('/admin/payroll');
  return { success: true };
}

export async function reopenPayrollMonth(month: number, year: number) {
  await prisma.payrollPeriod.update({
    where: { month_year: { month, year } },
    data: { status: 'OPEN' }
  });
  // We do NOT delete payslips, we just mark period as OPEN. 
  // UI will switch to "Live Calculation" mode.
  revalidatePath('/admin/payroll');
  return { success: true };
}
