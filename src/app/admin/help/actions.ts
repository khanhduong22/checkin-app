"use server";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
