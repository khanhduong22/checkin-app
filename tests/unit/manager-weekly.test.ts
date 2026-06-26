import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma and next-auth before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workShift: {
      findFirst: vi.fn(),
    },
    managerWeeklyTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    request: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import {
  getWeekBounds,
  verifyWeeklyChecklistComplete,
  reportAndCarryOverWeeklyTask,
} from "@/actions/manager-weekly-actions";

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
const mockShiftFindFirst = prisma.workShift.findFirst as ReturnType<typeof vi.fn>;
const mockWeeklyTaskFindUnique = prisma.managerWeeklyTask.findUnique as ReturnType<typeof vi.fn>;
const mockWeeklyTaskFindMany = prisma.managerWeeklyTask.findMany as ReturnType<typeof vi.fn>;
const mockWeeklyTaskCreate = prisma.managerWeeklyTask.create as ReturnType<typeof vi.fn>;
const mockWeeklyTaskUpdate = prisma.managerWeeklyTask.update as ReturnType<typeof vi.fn>;
const mockRequestCreate = prisma.request.create as ReturnType<typeof vi.fn>;

describe("getWeekBounds()", () => {
  it("calculates Monday 00:00:00 and Sunday 23:59:59.999 in VN timezone offset", async () => {
    // Friday June 26, 2026
    const date = new Date("2026-06-26T15:00:00.000Z"); // local: 2026-06-26 22:00:00 ICT
    const { weekStart, weekEnd } = await getWeekBounds(date);

    // Monday June 22, 2026 00:00:00 ICT is 2026-06-21T17:00:00.000Z
    expect(weekStart.toISOString()).toBe("2026-06-21T17:00:00.000Z");
    // Sunday June 28, 2026 23:59:59.999 ICT is 2026-06-28T16:59:59.999Z
    expect(weekEnd.toISOString()).toBe("2026-06-28T16:59:59.999Z");
  });
});

describe("verifyWeeklyChecklistComplete()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success if today is not the last working day of the week (future shifts exist)", async () => {
    // Mock that a future shift exists in the week
    mockShiftFindFirst.mockResolvedValue({ id: 1, status: "APPROVED" });

    const res = await verifyWeeklyChecklistComplete("user-1", "2026-06-26");
    expect(res.success).toBe(true);
    expect(mockWeeklyTaskFindMany).not.toHaveBeenCalled();
  });

  it("returns success if today is the last working day but all weekly tasks are completed", async () => {
    // Mock no future shift in the week
    mockShiftFindFirst.mockResolvedValue(null);
    // Mock completed weekly tasks
    mockWeeklyTaskFindMany.mockResolvedValue([
      { id: "wt-1", title: "Task 1", completed: true, explanation: null },
      { id: "wt-2", title: "Task 2", completed: true, explanation: "" },
    ]);

    const res = await verifyWeeklyChecklistComplete("user-1", "2026-06-26");
    expect(res.success).toBe(true);
  });

  it("returns success if today is the last working day, tasks are incomplete but have explanations", async () => {
    mockShiftFindFirst.mockResolvedValue(null);
    mockWeeklyTaskFindMany.mockResolvedValue([
      { id: "wt-1", title: "Task 1", completed: false, explanation: "Some explanation" },
    ]);

    const res = await verifyWeeklyChecklistComplete("user-1", "2026-06-26");
    expect(res.success).toBe(true);
  });

  it("returns failure if today is the last working day and weekly tasks are incomplete without explanation", async () => {
    mockShiftFindFirst.mockResolvedValue(null);
    mockWeeklyTaskFindMany.mockResolvedValue([
      { id: "wt-1", title: "Task 1", completed: false, explanation: null },
      { id: "wt-2", title: "Task 2", completed: false, explanation: "" },
    ]);

    const res = await verifyWeeklyChecklistComplete("user-1", "2026-06-26");
    expect(res.success).toBe(false);
    expect(res.message).toContain("2 nhiệm vụ tuần chưa hoàn thành");
  });
});

describe("reportAndCarryOverWeeklyTask()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates task explanation, creates next week's task copy, and submits a WEEKLY_TASK request", async () => {
    const monday = new Date("2026-06-21T17:00:00.000Z");
    const sunday = new Date("2026-06-28T16:59:59.999Z");

    const mockTask = {
      id: "wt-1",
      title: "Clean shop inventory",
      description: "Clean up shelf A and B",
      assigneeId: "user-1",
      weekStart: monday,
      weekEnd: sunday,
      completed: false,
    };

    mockWeeklyTaskFindUnique.mockResolvedValue(mockTask);
    mockWeeklyTaskUpdate.mockResolvedValue({ ...mockTask, explanation: "Late supplier" });

    // Mock session before calling actions that requireAdmin
    const sessionMock = { user: { email: "admin@example.com", role: "ADMIN" } };
    mockGetServerSession.mockResolvedValue(sessionMock);

    const res = await reportAndCarryOverWeeklyTask("wt-1", "Late supplier");

    expect(res.success).toBe(true);
    expect(mockWeeklyTaskUpdate).toHaveBeenCalledWith({
      where: { id: "wt-1" },
      data: { explanation: "Late supplier" },
    });

    const expectedNextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expectedNextSunday = new Date(sunday.getTime() + 7 * 24 * 60 * 60 * 1000);

    expect(mockWeeklyTaskCreate).toHaveBeenCalledWith({
      data: {
        title: "Clean shop inventory",
        description: "Clean up shelf A and B (Chuyển tiếp)",
        assigneeId: "user-1",
        weekStart: expectedNextMonday,
        weekEnd: expectedNextSunday,
        completed: false,
        isCarriedOver: true,
      },
    });

    expect(mockRequestCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        date: expect.any(Date),
        type: "WEEKLY_TASK",
        reason: "[Giải trình việc tuần: Clean shop inventory] Lý do: Late supplier. Đã chuyển tiếp sang tuần sau.",
        status: "PENDING",
      },
    });
  });
});
