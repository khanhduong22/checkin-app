import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Meilisearch } from "meilisearch";

function normalizeVietnamese(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

const prisma = new PrismaClient();

async function main() {
  const host = process.env.MEILISEARCH_HOST || "http://meilisearch:7700";
  const apiKey = process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_API_KEY || "";

  console.log(`Connecting to Meilisearch at ${host}...`);
  const client = new Meilisearch({ host, apiKey, timeout: 5000 });

  try {
    // 1. Fetch all users from PostgreSQL
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        image: true,
        employmentType: true,
      },
    });

    console.log(`Fetched ${users.length} users from PostgreSQL.`);

    // 2. Format documents with Vietnamese unaccented normalization
    const userDocs = users.map((u) => ({
      id: u.id,
      name: u.name,
      normalizedName: normalizeVietnamese(u.name),
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      image: u.image,
      employmentType: u.employmentType,
    }));

    // 3. Setup index & settings
    const userIndex = client.index("checkin_users");

    console.log("Configuring 'checkin_users' index settings...");
    await userIndex.updateSettings({
      searchableAttributes: ["name", "normalizedName", "email"],
      filterableAttributes: ["role", "isActive", "employmentType"],
      sortableAttributes: ["name"],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 3,
          twoTypos: 7,
        },
      },
    });

    // 4. Push documents to Meilisearch
    console.log(`Syncing ${userDocs.length} users to Meilisearch...`);
    const userTask = await userIndex.addDocuments(userDocs, { primaryKey: "id" });
    console.log(`✓ User sync task enqueued (Task UID: ${userTask.taskUid})`);

    // 5. Optionally sync staff tasks as well
    const tasks = await prisma.staffTask.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        assigneeId: true,
        createdAt: true,
      },
      take: 500,
    });

    if (tasks.length > 0) {
      console.log(`Fetched ${tasks.length} tasks from PostgreSQL.`);
      const taskDocs = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        normalizedTitle: normalizeVietnamese(t.title),
        description: t.description,
        status: t.status,
        assigneeId: t.assigneeId,
        createdAt: t.createdAt.toISOString(),
      }));

      const taskIndex = client.index("checkin_tasks");
      await taskIndex.updateSettings({
        searchableAttributes: ["title", "normalizedTitle", "description"],
        filterableAttributes: ["status", "assigneeId"],
        sortableAttributes: ["createdAt"],
      });

      const taskSyncRes = await taskIndex.addDocuments(taskDocs, { primaryKey: "id" });
      console.log(`✓ Task sync task enqueued (Task UID: ${taskSyncRes.taskUid})`);
    }

    console.log("\n=======================================================");
    console.log("🎉 Meilisearch Initial Sync Completed Successfully!");
    console.log("=======================================================");
  } catch (err: any) {
    console.error("❌ Failed to sync to Meilisearch:", err?.message || err);
    console.warn("Make sure Meilisearch is reachable at", host);
    // Don't throw fatal exit code to keep operations graceful
  } finally {
    await prisma.$disconnect();
  }
}

main();
