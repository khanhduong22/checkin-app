'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addAdjustment(userId: string, amount: number, reason: string) {
  // Basic validation? Assuming admin route protection handles auth.
  await prisma.payrollAdjustment.create({
    data: {
      userId,
      amount,
      reason
    }
  });

  revalidatePath('/admin/payroll');
  revalidatePath('/'); // Update user homepage
  return { success: true };
}
