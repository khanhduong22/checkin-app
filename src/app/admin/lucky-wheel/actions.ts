'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPrize(data: any) {
  try {
    await prisma.luckyWheelPrize.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        quantity: parseInt(data.quantity),
        remaining: parseInt(data.remaining),
        probability: parseFloat(data.probability),
        active: data.active === 'true' || data.active === true
      }
    });
    revalidatePath('/admin/lucky-wheel');
    return { success: true, message: 'Đã thêm giải thưởng' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Create fail' };
  }
}

export async function updatePrize(id: string, data: any) {
  try {
    await prisma.luckyWheelPrize.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        quantity: parseInt(data.quantity),
        remaining: parseInt(data.remaining),
        probability: parseFloat(data.probability),
        active: data.active === 'true' || data.active === true
      }
    });
    revalidatePath('/admin/lucky-wheel');
    return { success: true, message: 'Đã cập nhật' };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Update fail' };
  }
}

export async function deletePrize(id: string) {
  try {
    await prisma.luckyWheelPrize.delete({ where: { id } });
    revalidatePath('/admin/lucky-wheel');
    return { success: true, message: 'Deleted' };
  } catch (e) {
    return { success: false, message: 'Delete fail' };
  }
}
