"use server";

import { prisma } from "@/lib/prisma";

export async function getDocuments() {
  try {
    const docs = await prisma.document.findMany({
      select: { id: true, title: true, path: true, content: true },
      orderBy: { title: 'asc' }
    });
    return docs;
  } catch (e) {
    console.error(e);
    return [];
  }
}
