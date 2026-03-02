import { runBirthdayBonus } from "@/lib/birthday-bonus";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await runBirthdayBonus();

    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
