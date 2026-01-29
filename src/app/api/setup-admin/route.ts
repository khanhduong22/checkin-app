import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const secret = searchParams.get('secret');

  // Simple security
  if (secret !== 'duongphuckhanh_admin_setup') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });
    return NextResponse.json({ success: true, user });
  } catch (e) {
    return NextResponse.json({ error: 'User not found or DB error' }, { status: 500 });
  }
}
