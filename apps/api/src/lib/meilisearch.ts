import { Meilisearch } from "meilisearch";

let meiliClient: Meilisearch | null = null;

export function getMeiliClient(): Meilisearch | null {
  if (meiliClient) return meiliClient;

  const host = process.env.MEILISEARCH_HOST || "http://meilisearch:7700";
  const apiKey = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_API_KEY || "";

  try {
    meiliClient = new Meilisearch({
      host,
      apiKey,
      timeout: 2000,
    });
    return meiliClient;
  } catch (err) {
    console.warn("[Meilisearch Client Init Error]", err);
    return null;
  }
}

export async function checkMeiliHealth(): Promise<"connected" | "disconnected"> {
  const client = getMeiliClient();
  if (!client) return "disconnected";
  try {
    const health = await client.health();
    return health.status === "available" ? "connected" : "disconnected";
  } catch {
    return "disconnected";
  }
}
