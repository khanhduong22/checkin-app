'use server';

import { prisma } from "@/lib/prisma";
import { normalizeIP, isIPMatch } from "@/lib/ip-utils";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyChecklistComplete } from "@/actions/manager-checklist-actions";
import { verifyWeeklyChecklistComplete } from "@/actions/manager-weekly-actions";


export async function getIPStatus() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1";

  const allowedIps = await prisma.allowedIP.findMany();
  const prefixes = allowedIps.map((r: any) => r.prefix);

  // Auto-allow localhost for development if list is empty, otherwise enforce list
  const isAllowed = (process.env.NODE_ENV === 'development' && prefixes.length === 0)
    ? true
    : isIPMatch(realIp, prefixes);

  return {
    ip: realIp,
    isAllowed,
    locationName: isAllowed ? (allowedIps.find((ip: any) => realIp.startsWith(ip.prefix))?.label || "Văn phòng") : "Ngoài vùng phủ sóng"
  };
}

export async function performCheckIn(userId: string, type: 'checkin' | 'checkout', note?: string) {
  const headersList = await headers();
  // Vercel / Next.js agnostic IP retrieval
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : "127.0.0.1";

  // 1. Get Allowed IPs
  const allowedIps = await prisma.allowedIP.findMany();
  const prefixes = allowedIps.map((r: { prefix: string }) => r.prefix);

  // If no allowed IPs defined yet, allow localhost for setup (Optional safety)
  if (prefixes.length === 0) {
    // Warning: No security if empty list? Or Fail closed?
    // Let's allow setup by returning a specific error inviting to add IP
    // But for user experience, let's Fail if not match.
  }

  // Check IP
  const isAllowed = isIPMatch(realIp, prefixes);

  if (!isAllowed) {
    return {
      success: false,
      message: `❌ IP không hợp lệ: ${realIp}. Vui lòng kết nối Wi-Fi văn phòng.`
    };
  }

  // 2. Validate Sequence (Checkin -> Checkout -> Checkin)
  const lastCheckin = await prisma.checkIn.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' }
  });

  if (type === 'checkin') {
    if (lastCheckin && lastCheckin.type === 'checkin') {
      // Check if it's a new day? (Optional: auto-reset or force checkout)
      // For strict validation: Force checkout first.
      return { success: false, message: "⚠️ Bạn chưa Check-out lượt trước đó!" };
    }
  } else {
    // type === 'checkout'
    if (!lastCheckin || lastCheckin.type === 'checkout') {
      return { success: false, message: "⚠️ Bạn chưa Check-in, không thể Check-out!" };
    }

    // Validate Checklist Completed
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const vnNow = new Date(new Date().getTime() + VN_OFFSET_MS);
    const dateStr = vnNow.toISOString().split("T")[0];

    const checklistVerify = await verifyChecklistComplete(userId, dateStr);
    if (!checklistVerify.success) {
      return { success: false, message: checklistVerify.message };
    }

    const weeklyChecklistVerify = await verifyWeeklyChecklistComplete(userId, dateStr);
    if (!weeklyChecklistVerify.success) {
      return { success: false, message: weeklyChecklistVerify.message };
    }

    // Validate Time Gap (Minimum 1 hour)
    const now = new Date();
    const diff = now.getTime() - lastCheckin.timestamp.getTime();

    // Config: Prod = 60 min, Dev = 1 min (for testing)
    const MIN_DURATION = process.env.NODE_ENV === 'development'
      ? 1 * 60 * 1000
      : 60 * 60 * 1000;

    if (diff < MIN_DURATION) {
      const remainingMin = Math.ceil((MIN_DURATION - diff) / 60000);
      return {
        success: false,
        message: `⏳ Ca làm việc phải ít nhất 1 tiếng. Vui lòng chờ thêm ${remainingMin} phút nữa.`
      };
    }
  }

  // --- Early Leave Logic ---
  let extraMessage = "";
  if (type === 'checkout') {
    // 1. Find Shift for today
    // distinct shift for user on this day?
    // We need to be careful with timezone. "today" in VN time.
    // But simplifying: compare with shift that encompasses "now" or is "today".

    const now = new Date();
    // Simple lookup: Shift that starts today
    // We can use the same logic as in stats? 
    // Or just look for a shift where start <= now <= end? Or start and end are same day.
    // Let's look for shift starting within last 24h?

    // Best approach: Find shift where start matches today's date in VN time.
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayShift = await prisma.workShift.findFirst({
      where: {
        userId,
        start: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (todayShift) {
      const shiftEnd = new Date(todayShift.end);
      // Use a threshold? e.g. 15 mins.
      // If checkout is earlier than shiftEnd - 15 mins
      const threshold = 15 * 60 * 1000;
      if (now.getTime() < shiftEnd.getTime() - threshold) {
        // It is Early Leave
        if (note && note.trim().length > 0) {
          // Create Request
          await prisma.request.create({
            data: {
              userId,
              type: 'EARLY_LEAVE',
              date: now,
              reason: note,
              status: 'PENDING'
            }
          });
          extraMessage = " (Đã tạo yêu cầu về sớm, chờ duyệt)";
        } else {
          // Warn user? Or just let them proceed?
          // Current flow allows proceeding, but stats will count it as not fully paid (if we implement stats change).
          // We just add a message.
          extraMessage = " (Về sớm không lý do)";
        }
      }
    }
  }

  try {
    await prisma.checkIn.create({
      data: {
        userId,
        type,
        ipAddress: realIp,
        note: note
      }
    });

    revalidatePath('/'); // Refresh UI

    const timeStr = new Date().toLocaleTimeString('vi-VN');
    return {
      success: true,
      message: type === 'checkin'
        ? `✅ Check-in thành công lúc ${timeStr}`
        : `👋 Check-out thành công lúc ${timeStr}${extraMessage}`
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Lỗi hệ thống." };
  }
}
