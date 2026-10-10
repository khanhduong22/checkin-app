/**
 * IP and CIDR matching utilities for checkin security.
 * Supports IPv4 exact, IPv4 CIDR, IPv6 CIDR, and IPv6 /64 prefix matching.
 */

export function normalizeIP(ip: string): string {
  if (!ip) return "";
  const trimmed = ip.trim();
  if (trimmed.startsWith("::ffff:")) return trimmed.substring(7);
  return trimmed;
}

export function expandIPv6(ip: string): string | null {
  if (!ip.includes(":")) return null;

  const address = ip.replace(/[\[\]]/g, "").trim().toLowerCase();
  const [addrPart] = address.split("/");
  const segments = addrPart.split(":");
  if (segments.length > 8) return null;

  const emptyIndices = segments
    .map((s, idx) => (s === "" ? idx : -1))
    .filter((idx) => idx !== -1);

  if (emptyIndices.length > 0) {
    let validEmpty = false;
    if (emptyIndices.length === 1) {
      validEmpty = true;
    } else if (emptyIndices.length === 2) {
      if (emptyIndices[0] === 0 && emptyIndices[1] === 1) {
        validEmpty = true;
      } else if (
        emptyIndices[0] === segments.length - 2 &&
        emptyIndices[1] === segments.length - 1
      ) {
        validEmpty = true;
      }
    } else if (emptyIndices.length === 3) {
      if (
        segments.length === 3 &&
        emptyIndices[0] === 0 &&
        emptyIndices[1] === 1 &&
        emptyIndices[2] === 2
      ) {
        validEmpty = true;
      }
    }
    if (!validEmpty) return null;
  }

  const doubleColonIndex = segments.indexOf("");
  let expanded: string[] = [];

  if (doubleColonIndex !== -1) {
    const nonCompressedSegments = segments.filter((s) => s !== "").length;
    const missingCount = 8 - nonCompressedSegments;
    if (missingCount < 0) return null;
    const missingSegments = Array(missingCount).fill("0");

    let placedZeros = false;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === "") {
        if (!placedZeros) {
          expanded.push(...missingSegments);
          placedZeros = true;
        }
      } else {
        expanded.push(segments[i]);
      }
    }
  } else {
    expanded = [...segments];
  }

  while (expanded.length < 8) {
    expanded.push("0");
  }

  for (const seg of expanded) {
    if (seg.length > 4 || !/^[0-9a-f]*$/.test(seg)) {
      return null;
    }
  }

  return expanded.map((s) => s.padStart(4, "0")).join(":");
}

function ipv6ToBinary(expandedIp: string): string {
  return expandedIp
    .split(":")
    .map((seg) => parseInt(seg, 16).toString(2).padStart(16, "0"))
    .join("");
}

function ipv4ToBinary(ip: string): string | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  const binaryParts = [];
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    binaryParts.push(num.toString(2).padStart(8, "0"));
  }
  return binaryParts.join("");
}

export function matchCIDR(ip: string, cidr: string): boolean {
  const normIP = normalizeIP(ip);
  const normCIDR = normalizeIP(cidr);

  if (!normCIDR.includes("/")) return false;

  const [range, bitsStr] = normCIDR.split("/");
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits)) return false;

  // IPv4 case
  if (!normIP.includes(":") && !range.includes(":")) {
    const ipBin = ipv4ToBinary(normIP);
    const rangeBin = ipv4ToBinary(range);
    if (!ipBin || !rangeBin) return false;
    if (bits < 0 || bits > 32) return false;
    return ipBin.substring(0, bits) === rangeBin.substring(0, bits);
  }

  // IPv6 case
  if (normIP.includes(":") && range.includes(":")) {
    const expandedIP = expandIPv6(normIP);
    const expandedRange = expandIPv6(range);
    if (!expandedIP || !expandedRange) return false;
    if (bits < 0 || bits > 128) return false;

    const ipBin = ipv6ToBinary(expandedIP);
    const rangeBin = ipv6ToBinary(expandedRange);
    return ipBin.substring(0, bits) === rangeBin.substring(0, bits);
  }

  return false;
}

export function isIPMatch(clientIP: string, allowedPrefixes: string[]): boolean {
  const normalizedClient = normalizeIP(clientIP);

  for (const prefix of allowedPrefixes) {
    const normalizedPrefix = normalizeIP(prefix);

    // 1. CIDR Match
    if (normalizedPrefix.includes("/")) {
      if (matchCIDR(normalizedClient, normalizedPrefix)) {
        return true;
      }
      continue;
    }

    // 2. Exact match or startsWith prefix
    if (
      normalizedClient === normalizedPrefix ||
      normalizedClient.startsWith(normalizedPrefix)
    ) {
      return true;
    }

    // 3. Automatic IPv6 /64 prefix fallback
    if (normalizedClient.includes(":") && normalizedPrefix.includes(":")) {
      const clientExpanded = expandIPv6(normalizedClient);
      const prefixExpanded = expandIPv6(normalizedPrefix);

      if (clientExpanded && prefixExpanded) {
        const client64 = clientExpanded.split(":").slice(0, 4).join(":");
        const prefix64 = prefixExpanded.split(":").slice(0, 4).join(":");
        if (client64 === prefix64) {
          return true;
        }
      }
    }
  }

  return false;
}
