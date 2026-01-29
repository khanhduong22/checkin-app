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
  // DEV MODE BYPASS
  if (process.env.NODE_ENV === 'development') return true;

  const normalizedClient = normalizeIP(clientIP);
  for (const prefix of allowedPrefixes) {
    let checkPrefix = prefix;
    if (checkPrefix.startsWith('::ffff:') && !checkPrefix.includes(':')) {
      checkPrefix = checkPrefix.substring(7);
    }
    if (normalizedClient.startsWith(checkPrefix)) return true;
  }
  return false;
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

  try {
    await prisma.checkIn.create({
      data: {
        userId,
        type,
        ipAddress: realIp
      }
    });

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
