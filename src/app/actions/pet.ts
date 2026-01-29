'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPetStatus() {
  let pet = await prisma.shopPet.findUnique({ where: { id: "shop_pet" } });
  if (!pet) {
    pet = await prisma.shopPet.create({
      data: { id: "shop_pet", name: "Mèo Họa Sĩ" }
    });
  }
  return pet;
}

export async function feedPet() {
  // Logic: Feeding adds 5 Health, 5 Mood
  // Max 100
  await prisma.shopPet.update({
    where: { id: "shop_pet" },
    data: {
      health: { increment: 5 },
      mood: { increment: 5 },
      exp: { increment: 10 }
    }
  });

  // Level Up Check? (Simplified logic)
  // In real app, we check if EXP > threshold

  revalidatePath('/');
  return { success: true };
}

// Logic to punish pet (called when checking in late)
export async function punishPet() {
  await prisma.shopPet.update({
    where: { id: "shop_pet" },
    data: {
      health: { decrement: 10 },
      mood: { decrement: 20 }
    }
  });
  revalidatePath('/');
}
