import { autoScheduleAdminNa } from "@/lib/auto-schedule";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await autoScheduleAdminNa(12);

    return NextResponse.json({
        ok: true,
        result,
        timestamp: new Date().toISOString()
    });
}
