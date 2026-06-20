import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    checkIn: {
      findMany: vi.fn(),
    },
    workShift: {
      findMany: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    staffTask: {
      findMany: vi.fn(),
    },
    managerChecklistTask: {
      findMany: vi.fn(),
    },
    managerChecklistCompletion: {
      findMany: vi.fn(),
    },
  },
}));

import { getUserMonthlyStats } from "@/lib/stats";
import { verifyChecklistComplete } from "@/actions/manager-checklist-actions";
import { prisma } from "@/lib/prisma";

const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCheckInFindMany = prisma.checkIn.findMany as ReturnType<typeof vi.fn>;
const mockShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockRequestFindMany = prisma.request.findMany as ReturnType<typeof vi.fn>;
const mockRequestFindFirst = prisma.request.findFirst as ReturnType<typeof vi.fn>;
const mockHolidayFindMany = prisma.holiday.findMany as ReturnType<typeof vi.fn>;
const mockChecklistTaskFindMany = prisma.managerChecklistTask.findMany as ReturnType<typeof vi.fn>;
const mockChecklistCompletionFindMany = prisma.managerChecklistCompletion.findMany as ReturnType<typeof vi.fn>;

describe("getUserMonthlyStats() - Manager Checklist Compliance Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserRecord = {
    id: "manager-1",
    name: "Admin Manager",
    email: "manager@example.com",
    role: "ADMIN",
    employmentType: "FULL_TIME",
    hourlyRate: 0,
    monthlySalary: 10000000,
    adjustments: [],
  };

  const targetDate = new Date("2026-06-15T12:00:00+07:00");

  it("marks a working day as deficient if checklist tasks exist but are not completed", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift: 08:00 to 17:00 (UTC 01:00 to 10:00) on June 15, 2026
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "manager-1",
        start: new Date("2026-06-15T08:00:00+07:00"),
        end: new Date("2026-06-15T17:00:00+07:00"),
        status: "APPROVED",
      },
    ]);

    // Check-in / Check-out on June 15, 2026
    mockCheckInFindMany.mockResolvedValue([
      {
        id: 101,
        userId: "manager-1",
        type: "checkin",
        timestamp: new Date("2026-06-15T08:00:00+07:00"),
        ipAddress: "127.0.0.1",
        note: null,
      },
      {
        id: 102,
        userId: "manager-1",
        type: "checkout",
        timestamp: new Date("2026-06-15T17:00:00+07:00"),
        ipAddress: "127.0.0.1",
        note: null,
      },
    ]);

    // Active checklist task created on June 14, 2026
    mockChecklistTaskFindMany.mockResolvedValue([
      {
        id: "task-1",
        title: "Sweeping front yard",
        description: "Check if clean",
        assigneeId: "manager-1",
        active: true,
        createdAt: new Date("2026-06-14T08:00:00+07:00"),
      },
    ]);

    // No completion logged
    mockChecklistCompletionFindMany.mockResolvedValue([]);

    const stats = await getUserMonthlyStats("manager-1", targetDate);
    
    // Day should be marked as deficient
    const day = stats.dailyDetails.find(d => d.date === "2026-06-15");
    expect(day).toBeDefined();
    expect(day?.isChecklistIncomplete).toBe(true);
    expect(day?.isValid).toBe(false);
    expect(day?.error).toContain("Thiếu checklist");
    expect(stats.totalDeficiencies).toBe(1);
  });

  it("marks a working day as valid if all active checklist tasks are completed", async () => {
    mockUserFindUnique.mockResolvedValue(mockUserRecord);
    mockHolidayFindMany.mockResolvedValue([]);
    mockRequestFindMany.mockResolvedValue([]);
    
    // Shift: 08:00 to 17:00 on June 15, 2026
    mockShiftFindMany.mockResolvedValue([
      {
        id: 1,
        userId: "manager-1",
        start: new Date("2026-06-15T08:00:00+07:00"),
        end: new Date("2026-06-15T17:00:00+07:00"),
        status: "APPROVED",
      },
    ]);

    // Check-in / Check-out on June 15, 2026
    mockCheckInFindMany.mockResolvedValue([
      {
        id: 101,
        userId: "manager-1",
        type: "checkin",
        timestamp: new Date("2026-06-15T08:00:00+07:00"),
        ipAddress: "127.0.0.1",
        note: null,
      },
      {
        id: 102,
        userId: "manager-1",
        type: "checkout",
        timestamp: new Date("2026-06-15T17:00:00+07:00"),
        ipAddress: "127.0.0.1",
        note: null,
      },
    ]);

    // Active checklist task created on June 14, 2026
    mockChecklistTaskFindMany.mockResolvedValue([
      {
        id: "task-1",
        title: "Sweeping front yard",
        description: "Check if clean",
        assigneeId: "manager-1",
        active: true,
        createdAt: new Date("2026-06-14T08:00:00+07:00"),
      },
    ]);

    // Completion logged as true
    mockChecklistCompletionFindMany.mockResolvedValue([
      {
        id: "comp-1",
        taskId: "task-1",
        date: "2026-06-15",
        completed: true,
        completedAt: new Date("2026-06-15T09:00:00+07:00"),
      },
    ]);

    const stats = await getUserMonthlyStats("manager-1", targetDate);
    
    // Day should be valid with no deficiency
    const day = stats.dailyDetails.find(d => d.date === "2026-06-15");
    expect(day).toBeDefined();
    expect(day?.isChecklistIncomplete).toBe(false);
    expect(day?.isValid).toBe(true);
    expect(day?.error).toBeUndefined();
    expect(stats.totalDeficiencies).toBe(0);
  });
});

describe("verifyChecklistComplete()", () => {
  it("returns success if no active checklist tasks exist", async () => {
    mockChecklistTaskFindMany.mockResolvedValue([]);
    const res = await verifyChecklistComplete("manager-1", "2026-06-15");
    expect(res.success).toBe(true);
  });

  it("returns failure if active tasks exist but not completed", async () => {
    mockChecklistTaskFindMany.mockResolvedValue([
      { id: "task-1", title: "Task 1", active: true, assigneeId: "manager-1" }
    ]);
    mockChecklistCompletionFindMany.mockResolvedValue([]);
    
    const res = await verifyChecklistComplete("manager-1", "2026-06-15");
    expect(res.success).toBe(false);
    expect(res.message).toContain("chưa hoàn thành");
  });

  it("returns success if all active tasks are completed", async () => {
    mockChecklistTaskFindMany.mockResolvedValue([
      { id: "task-1", title: "Task 1", active: true, assigneeId: "manager-1" }
    ]);
    mockChecklistCompletionFindMany.mockResolvedValue([
      { taskId: "task-1", date: "2026-06-15", completed: true }
    ]);
    
    const res = await verifyChecklistComplete("manager-1", "2026-06-15");
    expect(res.success).toBe(true);
  });

  it("returns success if active tasks exist but an approved CHECKLIST request exists", async () => {
    mockChecklistTaskFindMany.mockResolvedValue([
      { id: "task-1", title: "Task 1", active: true, assigneeId: "manager-1" }
    ]);
    mockChecklistCompletionFindMany.mockResolvedValue([]);
    mockRequestFindFirst.mockResolvedValue({ id: 999, status: "APPROVED" });
    
    const res = await verifyChecklistComplete("manager-1", "2026-06-15");
    expect(res.success).toBe(true);
  });
});

