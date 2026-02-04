import { prisma } from "@/lib/prisma";
import { getUserMonthlyStats } from "@/lib/stats";

export async function calculatePayroll(month: number, year: number) {
  // Fetch all users
  const users = await prisma.user.findMany();

  // Target date (Middle of month to capture logic correctly)
  const targetDate = new Date(year, month - 1, 15);

  const payrollData = await Promise.all(users.map(async (user: any) => {
    const stats = await getUserMonthlyStats(user.id, targetDate);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      // Mapping stats to Payroll format
      ...stats
    };
  }));

  return payrollData;
}
