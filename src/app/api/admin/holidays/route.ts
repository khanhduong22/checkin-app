import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(holidays);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, name, multiplier } = await req.json();

    if (!date || !name || !multiplier) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: new Date(date),
        name,
        multiplier: parseFloat(multiplier)
      }
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Create Holiday Error:", error);
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.holiday.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}
