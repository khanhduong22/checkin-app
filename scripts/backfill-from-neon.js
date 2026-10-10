/**
 * Idempotent Data Backfill Script: Neon DB -> VPS checkin_db
 * 
 * Safely backfills missing records from Neon DB into local/VPS Postgres
 * WITHOUT dropping schemas, truncating tables, or overwriting existing data.
 */

const { PrismaClient } = require('@prisma/client');

const NEON_URL = process.env.NEON_DATABASE_URL || 
  "postgresql://neondb_owner:npg_ALj4rNpvPCZ3@ep-orange-dust-a1m4z6so-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Local/VPS database connection string (from process.env.DATABASE_URL or default VPS container URL)
const LOCAL_URL = process.env.DATABASE_URL || 
  "postgresql://kido:KidoVPS2026!@checkin-db:5432/checkin_db?sslmode=disable";

async function runBackfill() {
  console.log("=================================================");
  console.log("🚀 Starting Safe Neon -> VPS Data Backfill");
  console.log("Time:", new Date().toISOString());
  console.log("=================================================");

  const neonPrisma = new PrismaClient({
    datasources: { db: { url: NEON_URL } },
  });

  const localPrisma = new PrismaClient({
    datasources: { db: { url: LOCAL_URL } },
  });

  try {
    // 1. Backfill UserTask (Packing tasks submitted on Neon between Oct 2 and Oct 6)
    console.log("\n📦 [1/4] Checking UserTask records...");
    const neonUserTasks = await neonPrisma.userTask.findMany({
      where: {
        createdAt: { gte: new Date('2026-10-02T00:00:00Z') }
      },
      orderBy: { createdAt: 'asc' }
    });

    let userTasksAdded = 0;
    for (const task of neonUserTasks) {
      const exists = await localPrisma.userTask.findUnique({
        where: { id: task.id }
      });

      if (!exists) {
        // Ensure user exists locally
        const userExists = await localPrisma.user.findUnique({ where: { id: task.userId } });
        // Ensure taskDefinition exists locally
        const taskDefExists = await localPrisma.taskDefinition.findUnique({ where: { id: task.taskDefId } });

        if (userExists && taskDefExists) {
          await localPrisma.userTask.create({
            data: {
              id: task.id,
              userId: task.userId,
              taskDefId: task.taskDefId,
              taskItemId: task.taskItemId,
              unitPrice: task.unitPrice,
              status: task.status,
              quantity: task.quantity,
              evidenceLink: task.evidenceLink,
              note: task.note,
              startedAt: task.startedAt,
              submittedAt: task.submittedAt,
              reviewedAt: task.reviewedAt,
              reviewedBy: task.reviewedBy,
              finalAmount: task.finalAmount,
              adminNote: task.adminNote,
              bonusPenalty: task.bonusPenalty,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
            }
          });
          userTasksAdded++;
          console.log(`  + Backfilled UserTask: ${task.id} (${task.status}) for user ${task.userId}`);
        } else {
          console.warn(`  ⚠️ Skipped UserTask ${task.id}: user (${task.userId}) or taskDef (${task.taskDefId}) missing locally.`);
        }
      }
    }
    console.log(`✅ UserTask backfill done: ${userTasksAdded} new record(s) inserted.`);

    // 2. Backfill CheckIn records (Attendance records from Oct 2 to Oct 6)
    console.log("\n⏱️ [2/4] Checking CheckIn records...");
    const neonCheckins = await neonPrisma.checkIn.findMany({
      where: {
        timestamp: { gte: new Date('2026-10-02T00:00:00Z') }
      },
      orderBy: { timestamp: 'asc' }
    });

    let checkinsAdded = 0;
    for (const c of neonCheckins) {
      const existing = await localPrisma.checkIn.findFirst({
        where: {
          userId: c.userId,
          type: c.type,
          timestamp: {
            gte: new Date(c.timestamp.getTime() - 60000),
            lte: new Date(c.timestamp.getTime() + 60000)
          }
        }
      });

      if (!existing) {
        const userExists = await localPrisma.user.findUnique({ where: { id: c.userId } });
        if (userExists) {
          await localPrisma.checkIn.create({
            data: {
              userId: c.userId,
              type: c.type,
              timestamp: c.timestamp,
              ipAddress: c.ipAddress,
              note: c.note
            }
          });
          checkinsAdded++;
          console.log(`  + Backfilled CheckIn: User ${c.userId}, Type: ${c.type}, Time: ${c.timestamp.toISOString()}`);
        }
      }
    }
    console.log(`✅ CheckIn backfill done: ${checkinsAdded} new record(s) inserted.`);

    // 3. Backfill WorkShift records from Oct 2
    console.log("\n📅 [3/4] Checking WorkShift records...");
    const neonShifts = await neonPrisma.workShift.findMany({
      where: {
        createdAt: { gte: new Date('2026-10-02T00:00:00Z') }
      },
      orderBy: { createdAt: 'asc' }
    });

    let shiftsAdded = 0;
    for (const s of neonShifts) {
      const existing = await localPrisma.workShift.findFirst({
        where: {
          userId: s.userId,
          start: s.start,
          end: s.end
        }
      });

      if (!existing) {
        const userExists = await localPrisma.user.findUnique({ where: { id: s.userId } });
        if (userExists) {
          await localPrisma.workShift.create({
            data: {
              userId: s.userId,
              start: s.start,
              end: s.end,
              shiftType: s.shiftType,
              status: s.status,
              isOpenForSwap: s.isOpenForSwap,
              isSenior: s.isSenior,
              createdAt: s.createdAt
            }
          });
          shiftsAdded++;
          console.log(`  + Backfilled WorkShift: User ${s.userId}, Start: ${s.start.toISOString()}`);
        }
      }
    }
    console.log(`✅ WorkShift backfill done: ${shiftsAdded} new record(s) inserted.`);

    // 4. Backfill StaffTask updates from Oct 2
    console.log("\n📋 [4/4] Checking StaffTask updates...");
    const neonStaffTasks = await neonPrisma.staffTask.findMany({
      where: {
        updatedAt: { gte: new Date('2026-10-02T05:44:28Z') }
      }
    });

    let staffTasksUpdated = 0;
    for (const st of neonStaffTasks) {
      const localTask = await localPrisma.staffTask.findUnique({
        where: { id: st.id }
      });
      if (localTask && localTask.updatedAt < st.updatedAt) {
        await localPrisma.staffTask.update({
          where: { id: st.id },
          data: {
            status: st.status,
            submittedAt: st.submittedAt,
            completedAt: st.completedAt,
            adminNote: st.adminNote,
            evidenceLink: st.evidenceLink,
            evidenceNote: st.evidenceNote,
            updatedAt: st.updatedAt
          }
        });
        staffTasksUpdated++;
        console.log(`  + Updated StaffTask: ${st.id} status to ${st.status}`);
      }
    }
    console.log(`✅ StaffTask update done: ${staffTasksUpdated} record(s) updated.`);

    // 5. Backfill TaskItem records (Marketplace items)
    console.log("\n🏪 [5/6] Checking TaskItem (Marketplace) records...");
    const neonTaskItems = await neonPrisma.taskItem.findMany();
    let taskItemsAdded = 0;
    for (const item of neonTaskItems) {
      const exists = await localPrisma.taskItem.findUnique({ where: { id: item.id } });
      if (!exists) {
        const defExists = await localPrisma.taskDefinition.findUnique({ where: { id: item.taskDefId } });
        if (defExists) {
          await localPrisma.taskItem.create({
            data: {
              id: item.id,
              taskDefId: item.taskDefId,
              title: item.title,
              description: item.description,
              deadline: item.deadline,
              status: item.status,
              assigneeId: item.assigneeId,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }
          });
          taskItemsAdded++;
          console.log(`  + Backfilled TaskItem: ${item.id} (${item.title})`);
        }
      }
    }
    console.log(`✅ TaskItem backfill done: ${taskItemsAdded} new record(s) inserted.`);

    // 6. Backfill Request records from Oct 1
    console.log("\n📝 [6/6] Checking Request records...");
    const neonRequests = await neonPrisma.request.findMany({
      where: { createdAt: { gte: new Date('2026-10-01T00:00:00Z') } }
    });
    let requestsAdded = 0;
    for (const req of neonRequests) {
      const exists = await localPrisma.request.findUnique({ where: { id: req.id } });
      if (!exists) {
        const userExists = await localPrisma.user.findUnique({ where: { id: req.userId } });
        if (userExists) {
          await localPrisma.request.create({
            data: {
              id: req.id,
              userId: req.userId,
              type: req.type,
              reason: req.reason,
              date: req.date,
              status: req.status,
              createdAt: req.createdAt
            }
          });
          requestsAdded++;
          console.log(`  + Backfilled Request: ${req.id} for user ${req.userId}`);
        }
      }
    }
    console.log(`✅ Request backfill done: ${requestsAdded} new record(s) inserted.`);

    console.log("\n=================================================");
    console.log("🎉 All Neon Delta Backfill Operations COMPLETED!");
    console.log(`Summary: UserTasks: +${userTasksAdded}, CheckIns: +${checkinsAdded}, Shifts: +${shiftsAdded}, StaffTasks: ${staffTasksUpdated}, TaskItems: +${taskItemsAdded}, Requests: +${requestsAdded}`);
    console.log("=================================================");

  } catch (error) {
    console.error("❌ Backfill failed with error:", error);
    process.exit(1);
  } finally {
    await neonPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

runBackfill();
