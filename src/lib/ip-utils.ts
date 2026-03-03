/**
 * IP utility helpers extracted from actions.ts for testability.
 */

/**
 * Normalize IP: strip IPv4-mapped IPv6 prefix ::ffff:
 */
export function normalizeIP(ip: string): string {
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) return ip.substring(7);
  return ip;
}

/**
 * Check if a clientIP matches any of the allowed prefixes.
 * Supports exact match and prefix match (e.g., "192.168.1" matches "192.168.1.100").
 */
export function isIPMatch(clientIP: string, allowedPrefixes: string[]): boolean {
  const normalizedClient = normalizeIP(clientIP);
  for (const prefix of allowedPrefixes) {
    // Normalize the stored prefix the same way we normalize client IPs
    const normalizedPrefix = normalizeIP(prefix);
    if (normalizedClient === normalizedPrefix || normalizedClient.startsWith(normalizedPrefix)) {
      return true;
    }
  }
  return false;
}
