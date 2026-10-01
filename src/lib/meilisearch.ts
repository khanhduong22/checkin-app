import { Meilisearch } from "meilisearch";
import { prisma } from "@/lib/prisma";
import { normalizeVietnamese } from "@/lib/utils";

const MEILI_HOST = process.env.MEILISEARCH_HOST || "http://meilisearch:7700";
const MEILI_KEY = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_API_KEY || "";

let meiliClientInstance: Meilisearch | null = null;

export function resetMeiliClient(): void {
  meiliClientInstance = null;
}

export function getMeiliClient(): Meilisearch | null {
  if (!meiliClientInstance) {
    try {
      meiliClientInstance = new Meilisearch({
        host: MEILI_HOST,
        apiKey: MEILI_KEY,
        timeout: 2000,
      });
    } catch (err) {
      console.warn("[Meilisearch Warning] Failed to initialize Meilisearch client:", err);
      return null;
    }
  }
  return meiliClientInstance;
}

export interface MeiliUserDocument {
  id: string;
  name: string | null;
  normalizedName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  image: string | null;
  employmentType: string;
}

export interface MeiliTaskDocument {
  id: string;
  title: string;
  normalizedTitle: string;
  description: string | null;
  status: string;
  assigneeId: string;
  createdAt: string;
}

/**
 * Searches users using Meilisearch with typo-tolerance and Vietnamese tone normalization.
 * Zero-crash invariant: Falls back to PostgreSQL (Prisma contains query) if Meilisearch is down or errors.
 */
export async function searchUsers(
  query: string,
  options?: { limit?: number; activeOnly?: boolean }
) {
  const limit = options?.limit || 20;
  const trimmed = query.trim();

  if (!trimmed) {
    return await prisma.user.findMany({
      where: options?.activeOnly ? { isActive: true } : undefined,
      take: limit,
      orderBy: { name: "asc" },
    });
  }

  const normalizedQuery = normalizeVietnamese(trimmed);

  // 1. Try Meilisearch
  try {
    const client = getMeiliClient();
    if (!client) throw new Error("Meilisearch client not available");

    const index = client.index<MeiliUserDocument>("checkin_users");
    const searchRes = await index.search(trimmed, {
      limit,
      filter: options?.activeOnly ? ["isActive = true"] : undefined,
    });

    if (searchRes.hits && searchRes.hits.length > 0) {
      return searchRes.hits;
    }

    // If query has accents, also try searching with normalized unaccented string
    if (normalizedQuery !== trimmed.toLowerCase()) {
      const normRes = await index.search(normalizedQuery, {
        limit,
        filter: options?.activeOnly ? ["isActive = true"] : undefined,
      });
      if (normRes.hits && normRes.hits.length > 0) {
        return normRes.hits;
      }
    }
  } catch (err) {
    console.warn(`[Meilisearch Warning] User search for "${query}" failed, falling back to PostgreSQL:`, err);
  }

  // 2. Graceful Fallback: PostgreSQL (Prisma query)
  try {
    const dbResults = await prisma.user.findMany({
      where: {
        AND: [
          options?.activeOnly ? { isActive: true } : {},
          {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { email: { contains: trimmed, mode: "insensitive" } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    if (dbResults.length > 0) {
      return dbResults;
    }

    // In-memory unaccented fallback for Vietnamese name matching if DB contains didn't catch accents
    const candidates = await prisma.user.findMany({
      where: options?.activeOnly ? { isActive: true } : undefined,
      take: 100,
    });

    return candidates
      .filter((u) => {
        const uNorm = normalizeVietnamese(u.name);
        const emailNorm = (u.email || "").toLowerCase();
        return uNorm.includes(normalizedQuery) || emailNorm.includes(normalizedQuery);
      })
      .slice(0, limit);
  } catch (dbErr) {
    console.error("[Search Error] PostgreSQL fallback failed:", dbErr);
    return [];
  }
}

/**
 * Searches staff tasks using Meilisearch with graceful fallback to PostgreSQL.
 */
export async function searchTasks(
  query: string,
  options?: { limit?: number; assigneeId?: string }
) {
  const limit = options?.limit || 20;
  const trimmed = query.trim();

  if (!trimmed) {
    return await prisma.staffTask.findMany({
      where: options?.assigneeId ? { assigneeId: options.assigneeId } : undefined,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  // 1. Try Meilisearch
  try {
    const client = getMeiliClient();
    if (!client) throw new Error("Meilisearch client not available");

    const index = client.index<MeiliTaskDocument>("checkin_tasks");
    const filter = options?.assigneeId ? [`assigneeId = "${options.assigneeId}"`] : undefined;

    const searchRes = await index.search(trimmed, {
      limit,
      filter,
    });

    if (searchRes.hits && searchRes.hits.length > 0) {
      return searchRes.hits;
    }
  } catch (err) {
    console.warn(`[Meilisearch Warning] Task search for "${query}" failed, falling back to PostgreSQL:`, err);
  }

  // 2. Graceful Fallback: PostgreSQL
  try {
    return await prisma.staffTask.findMany({
      where: {
        AND: [
          options?.assigneeId ? { assigneeId: options.assigneeId } : {},
          {
            OR: [
              { title: { contains: trimmed, mode: "insensitive" } },
              { description: { contains: trimmed, mode: "insensitive" } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  } catch (dbErr) {
    console.error("[Search Error] PostgreSQL fallback failed for tasks:", dbErr);
    return [];
  }
}
