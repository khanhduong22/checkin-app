'use server';

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// Helper to normalize IP
function normalizeIP(ip: string) {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

function isIPMatch(clientIP: string, allowedPrefixes: string[]) {
  // if (process.env.NODE_ENV === 'development') return true; // Disabled for strict testing

  const normalizedClient = normalizeIP(clientIP);
  for (const prefix of allowedPrefixes) {
    let checkPrefix = prefix;
    if (checkPrefix.startsWith('::ffff:') && !checkPrefix.includes(':')) {
      checkPrefix = checkPrefix.substring(7);
    }
    // Simple verification
    if (normalizedClient === checkPrefix || normalizedClient.startsWith(checkPrefix)) return true;
  }
  return false;
}

export async function getIPStatus() {
  const headersList = headers();
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

export async function performCheckIn(userId: string, type: 'checkin' | 'checkout') {
  const headersList = headers();
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

  try {
    await prisma.checkIn.create({
      data: {
        userId,
        type,
        ipAddress: realIp
      }
    });

    // --- Pet Logic Interface ---
    if (type === 'checkin') {
      const { feedPet, punishPet } = await import("./actions/pet");
      const hour = new Date().getHours() + 7; // Convert to VN time roughly or use getHours() local
      // Assuming server time matches local or simply:
      // Use logic 9:00 AM threshold.
      // Actually, simple way: current hour.
      const currentHour = new Date().getHours();

      // Late if > 9 (meaning 9:01+)
      if (currentHour < 9) {
        await feedPet();
      } else if (currentHour >= 9) {
        await punishPet();
      }
    }
    // ---------------------------

    revalidatePath('/'); // Refresh UI

    const timeStr = new Date().toLocaleTimeString('vi-VN');
    return {
      success: true,
      message: type === 'checkin'
        ? `✅ Check-in thành công lúc ${timeStr}`
        : `👋 Check-out thành công lúc ${timeStr}`
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Lỗi hệ thống." };
  }
}
