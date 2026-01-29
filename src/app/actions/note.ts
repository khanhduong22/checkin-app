'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createNote(content: string, color: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { success: false, message: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { success: false, message: "User not found" };

  await prisma.stickyNote.create({
    data: {
      content,
      color,
      userId: user.id
    }
  });
  revalidatePath('/');
  return { success: true };
}

export async function deleteNote(id: string) {
  // Anyone can delete? Let's assume yes for a small team, or only author/admin.
  // For simplicity: collaborative style, anyone can "Done" (delete) a note.
  await prisma.stickyNote.delete({ where: { id } });
  revalidatePath('/');
  return { success: true };
}
