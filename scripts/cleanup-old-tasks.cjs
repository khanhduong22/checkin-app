const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || "checkin-app-jwt-secret-monorepo-safe-2026";
const API_BASE = process.env.API_BASE || "https://limart2.khanhdp.com";

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 3600
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function main() {
  const token = signJwt(
    {
      sub: "admin-cleanup-system",
      email: "admin@limart.vn",
      role: "ADMIN",
      name: "System Admin"
    },
    JWT_SECRET
  );

  console.log("==================================================");
  console.log("Cleaning up stale unapproved tasks (Feb - May 2026)");
  console.log("Target:", `${API_BASE}/api/admin/tasks/stale-pending?before=2026-06-01T00:00:00.000Z`);
  console.log("==================================================");

  const res = await fetch(`${API_BASE}/api/admin/tasks/stale-pending?before=2026-06-01T00:00:00.000Z`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));

  // Verify pending tasks count
  console.log("\n==================================================");
  console.log("Verifying remaining pending tasks on Staging...");
  console.log("==================================================");

  const checkRes = await fetch(`${API_BASE}/api/admin/tasks`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const checkData = await checkRes.json();
  const allTasks = checkData.data || [];
  const submittedTasks = allTasks.filter(t => t.status === "SUBMITTED");
  const pendingTasks = allTasks.filter(t => t.status === "PENDING");

  console.log(`Total tasks remaining: ${allTasks.length}`);
  console.log(`Tasks with status SUBMITTED: ${submittedTasks.length}`);
  console.log(`Tasks with status PENDING: ${pendingTasks.length}`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
