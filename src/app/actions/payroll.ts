'use server';

import { prisma } from "@/lib/prisma";
import { getUserMonthlyStats } from "@/lib/stats";
import { revalidatePath } from "next/cache";
import fs from 'fs';

export async function addAdjustment(userId: string, amount: number, reason: string) {
  const log = (msg: string) => {
    try { fs.appendFileSync('server-action.log', new Date().toISOString() + ' : ' + msg + '\n'); } catch(e){}
    console.log(msg);
  };
  
  log(`[addAdjustment] Called with userId=${userId}, amount=${amount}, reason=${reason}`);
  try {
    const result = await prisma.payrollAdjustment.create({
      data: {
        userId,
        amount,
        reason
      }
    });
    log(`[addAdjustment] Successfully created record: ${result.id}`);

    log(`[addAdjustment] skipping revalidate paths to prevent deadlock`);
    
    return { success: true, timestamp: Date.now() };
  } catch (error: any) {
    log(`[addAdjustment] Server Action Error: ` + error?.message);
    throw new Error("Failed to add adjustment on the server.");
  }
}

import { EmploymentType } from "@prisma/client";

export async function closePayrollMonth(month: number, year: number, bonusPercent: number, targets: EmploymentType[] = ['PART_TIME']) {
  // 1. Get all users
  const users = await prisma.user.findMany({});

  // 2. Calculate stats
  const targetDate = new Date(year, month - 1, 28);

  const snapshots = await Promise.all(users.map(async (u) => {
    const stats = await getUserMonthlyStats(u.id, targetDate);

    // Calculate Final Net with Bonus
    const shouldApplyBonus = targets.includes(u.employmentType);
    const bonusAmount = shouldApplyBonus ? stats.baseSalary * (bonusPercent / 100) : 0;
    const finalNet = stats.totalSalary + bonusAmount;

    return {
      userId: u.id,
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
  }));

  // 3. Save to DB
  await prisma.$transaction(async (tx) => {
    // Create/Update Period
    await tx.payrollPeriod.upsert({
      where: { month_year: { month, year } },
      create: { month, year, status: 'CLOSED', bonusPercent, bonusTargets: targets },
      update: { status: 'CLOSED', bonusPercent, bonusTargets: targets }
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

export async function updatePayrollBonus(month: number, year: number, bonusPercent: number, targets: EmploymentType[] = ['PART_TIME']) {
  await prisma.payrollPeriod.upsert({
    where: { month_year: { month, year } },
    create: { month, year, bonusPercent, bonusTargets: targets },
    update: { bonusPercent, bonusTargets: targets }
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
