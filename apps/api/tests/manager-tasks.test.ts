import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockChecklistCount,
  mockChecklistFindMany,
  mockChecklistFindUnique,
  mockChecklistCreate,
  mockChecklistUpdate,
  mockChecklistDelete,
  mockCompletionFindMany,
  mockCompletionUpsert,
  mockWeeklyFindMany,
  mockWeeklyFindUnique,
  mockWeeklyCreate,
  mockWeeklyUpdate,
  mockWeeklyDelete,
  mockRequestCreate,
  mockCalculateUserMonthlyStats,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockChecklistCount: vi.fn(),
  mockChecklistFindMany: vi.fn(),
  mockChecklistFindUnique: vi.fn(),
  mockChecklistCreate: vi.fn(),
  mockChecklistUpdate: vi.fn(),
  mockChecklistDelete: vi.fn(),
  mockCompletionFindMany: vi.fn(),
  mockCompletionUpsert: vi.fn(),
  mockWeeklyFindMany: vi.fn(),
  mockWeeklyFindUnique: vi.fn(),
  mockWeeklyCreate: vi.fn(),
  mockWeeklyUpdate: vi.fn(),
  mockWeeklyDelete: vi.fn(),
  mockRequestCreate: vi.fn(),
  mockCalculateUserMonthlyStats: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    managerChecklistTask: {
      count: mockChecklistCount,
      findMany: mockChecklistFindMany,
      findUnique: mockChecklistFindUnique,
      create: mockChecklistCreate,
      update: mockChecklistUpdate,
      delete: mockChecklistDelete,
    },
    managerChecklistCompletion: {
      findMany: mockCompletionFindMany,
      upsert: mockCompletionUpsert,
    },
    managerWeeklyTask: {
      findMany: mockWeeklyFindMany,
      findUnique: mockWeeklyFindUnique,
      create: mockWeeklyCreate,
      update: mockWeeklyUpdate,
      delete: mockWeeklyDelete,
    },
    request: {
      create: mockRequestCreate,
    },
    $transaction: vi.fn().mockImplementation((actions) =>
      Array.isArray(actions) ? Promise.all(actions) : actions(prisma)
    ),
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../src/lib/cache", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue(undefined),
  getOrSetCache: vi.fn().mockImplementation((_k, _t, fn) => fn()),
}));

vi.mock("../src/lib/payroll-calculator", () => ({
  calculateUserMonthlyStats: mockCalculateUserMonthlyStats,
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Manager Tasks REST Endpoints (/api/manager-tasks)", () => {
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    adminToken = await signAccessToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });

    staffToken = await signAccessToken({
      sub: "staff-1",
      email: "staff@example.com",
      role: "STAFF",
    });
  });

  describe("GET /api/manager-tasks/users", () => {
    it("returns list of active users", async () => {
      mockUserFindMany.mockResolvedValueOnce([
        { id: "u-1", name: "Alice", email: "alice@test.com", role: "ADMIN", image: null },
        { id: "u-2", name: "Bob", email: "bob@test.com", role: "STAFF", image: null },
      ]);

      const res = await app.request("/api/manager-tasks/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].name).toBe("Alice");
    });
  });

  describe("GET /api/manager-tasks/checklist", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await app.request("/api/manager-tasks/checklist");
      expect(res.status).toBe(401);
    });

    it("returns 403 when non-admin accesses another user's checklist", async () => {
      const res = await app.request("/api/manager-tasks/checklist?userId=other-user", {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("seeds default tasks if count is 0 and returns checklist with completion", async () => {
      mockChecklistCount.mockResolvedValueOnce(0);
      mockChecklistCreate.mockResolvedValue({});

      const mockTasks = [
        {
          id: "task-1",
          title: "🧹 Vệ sinh",
          description: "Quét dọn",
          active: true,
          targetDate: null,
          order: 0,
          createdAt: new Date(),
        },
      ];
      mockChecklistFindMany.mockResolvedValueOnce(mockTasks);

      const mockCompletions = [
        {
          id: "comp-1",
          taskId: "task-1",
          date: "2026-10-06",
          completed: true,
          completedAt: new Date("2026-10-06T09:00:00Z"),
        },
      ];
      mockCompletionFindMany.mockResolvedValueOnce(mockCompletions);

      const res = await app.request("/api/manager-tasks/checklist?userId=admin-1&date=2026-10-06", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("task-1");
      expect(json.data[0].completed).toBe(true);
      expect(json.data[0].completedAt).toBeDefined();
    });
  });

  describe("POST /api/manager-tasks/checklist/toggle", () => {
    it("returns 400 when taskId is missing", async () => {
      const res = await app.request("/api/manager-tasks/checklist/toggle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 when task does not exist", async () => {
      mockChecklistFindUnique.mockResolvedValueOnce(null);

      const res = await app.request("/api/manager-tasks/checklist/toggle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: "non-existent", date: "2026-10-06", completed: true }),
      });

      expect(res.status).toBe(404);
    });

    it("upserts completion successfully", async () => {
      mockChecklistFindUnique.mockResolvedValueOnce({ id: "task-1" });
      mockCompletionUpsert.mockResolvedValueOnce({
        id: "comp-1",
        taskId: "task-1",
        date: "2026-10-06",
        completed: true,
        completedAt: new Date(),
      });

      const res = await app.request("/api/manager-tasks/checklist/toggle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: "task-1", date: "2026-10-06", completed: true }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.completed).toBe(true);
    });
  });

  describe("POST /api/manager-tasks/checklist (create)", () => {
    it("returns 403 for non-admin", async () => {
      const res = await app.request("/api/manager-tasks/checklist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Task 1", assigneeId: "admin-1" }),
      });

      expect(res.status).toBe(403);
    });

    it("returns 400 when title is missing", async () => {
      const res = await app.request("/api/manager-tasks/checklist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "", assigneeId: "admin-1" }),
      });

      expect(res.status).toBe(400);
    });

    it("creates a checklist task successfully", async () => {
      mockChecklistCreate.mockResolvedValueOnce({
        id: "task-new",
        title: "Kiểm kho",
        description: "Kiểm kê hàng",
        assigneeId: "admin-1",
        active: true,
        targetDate: null,
      });

      const res = await app.request("/api/manager-tasks/checklist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Kiểm kho",
          description: "Kiểm kê hàng",
          assigneeId: "admin-1",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("task-new");
    });
  });

  describe("PATCH /api/manager-tasks/checklist/:id", () => {
    it("updates checklist task properties", async () => {
      mockChecklistFindUnique.mockResolvedValueOnce({ id: "task-1" });
      mockChecklistUpdate.mockResolvedValueOnce({
        id: "task-1",
        title: "Updated Title",
        active: false,
      });

      const res = await app.request("/api/manager-tasks/checklist/task-1", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated Title", active: false }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Updated Title");
      expect(json.data.active).toBe(false);
    });
  });

  describe("DELETE /api/manager-tasks/checklist/:id", () => {
    it("deletes task successfully", async () => {
      mockChecklistFindUnique.mockResolvedValueOnce({ id: "task-1" });
      mockChecklistDelete.mockResolvedValueOnce({ id: "task-1" });

      const res = await app.request("/api/manager-tasks/checklist/task-1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("POST /api/manager-tasks/checklist/reorder", () => {
    it("updates orders in transaction", async () => {
      mockChecklistUpdate.mockResolvedValue({});

      const res = await app.request("/api/manager-tasks/checklist/reorder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: "admin-1", taskIds: ["t-1", "t-2", "t-3"] }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("GET /api/manager-tasks/templates", () => {
    it("returns template list for user", async () => {
      mockChecklistCount.mockResolvedValueOnce(2);
      mockChecklistFindMany.mockResolvedValueOnce([
        { id: "t-1", title: "Task 1", order: 0 },
        { id: "t-2", title: "Task 2", order: 1 },
      ]);

      const res = await app.request("/api/manager-tasks/templates?userId=admin-1", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
    });
  });

  describe("GET /api/manager-tasks/stats-history", () => {
    it("calculates stats history and flags checklist deficiency on working days", async () => {
      mockCalculateUserMonthlyStats.mockResolvedValueOnce({
        userId: "admin-1",
        totalHours: 16,
        daysWorked: 2,
        lateCount: 0,
        dailyDetails: [
          {
            date: "2026-10-06",
            hours: 8,
            shift: "08:00 - 17:00",
            error: undefined,
          },
          {
            date: "2026-10-05",
            hours: 8,
            shift: "08:00 - 17:00",
            error: undefined,
          },
        ],
      });

      mockChecklistFindMany.mockResolvedValueOnce([
        {
          id: "t-1",
          active: true,
          targetDate: null,
          createdAt: new Date("2026-10-01"),
        },
      ]);

      mockCompletionFindMany.mockResolvedValueOnce([
        {
          taskId: "t-1",
          date: "2026-10-05",
          completed: true,
        },
        // 2026-10-06 has NO completion!
      ]);

      const res = await app.request("/api/manager-tasks/stats-history?userId=admin-1&date=2026-10-06", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalDeficiencies).toBe(1);
      const day6 = json.data.dailyDetails.find((d: any) => d.date === "2026-10-06");
      expect(day6.isChecklistIncomplete).toBe(true);
      expect(day6.error).toContain("Thiếu checklist");
    });
  });

  describe("Weekly Tasks Endpoints", () => {
    it("GET /api/manager-tasks/weekly returns weekly tasks for week bounds", async () => {
      mockWeeklyFindMany.mockResolvedValueOnce([
        { id: "w-1", title: "Việc tuần 1", completed: false },
      ]);

      const res = await app.request("/api/manager-tasks/weekly?userId=admin-1&date=2026-10-06", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe("w-1");
    });

    it("POST /api/manager-tasks/weekly creates weekly task", async () => {
      mockWeeklyCreate.mockResolvedValueOnce({
        id: "w-new",
        title: "Báo cáo tuần",
        assigneeId: "admin-1",
        completed: false,
      });

      const res = await app.request("/api/manager-tasks/weekly", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Báo cáo tuần",
          assigneeId: "admin-1",
          dateStr: "2026-10-06",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("w-new");
    });

    it("PATCH /api/manager-tasks/weekly/:id updates weekly task", async () => {
      mockWeeklyFindUnique.mockResolvedValueOnce({ id: "w-1" });
      mockWeeklyUpdate.mockResolvedValueOnce({ id: "w-1", title: "Sửa việc tuần" });

      const res = await app.request("/api/manager-tasks/weekly/w-1", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Sửa việc tuần" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Sửa việc tuần");
    });

    it("DELETE /api/manager-tasks/weekly/:id deletes weekly task", async () => {
      mockWeeklyFindUnique.mockResolvedValueOnce({ id: "w-1" });
      mockWeeklyDelete.mockResolvedValueOnce({ id: "w-1" });

      const res = await app.request("/api/manager-tasks/weekly/w-1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("POST /api/manager-tasks/weekly/:id/toggle toggles completion", async () => {
      mockWeeklyFindUnique.mockResolvedValueOnce({ id: "w-1" });
      mockWeeklyUpdate.mockResolvedValueOnce({ id: "w-1", completed: true, completedAt: new Date() });

      const res = await app.request("/api/manager-tasks/weekly/w-1/toggle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.completed).toBe(true);
    });

    it("POST /api/manager-tasks/weekly/:id/carry-over carries over to next week and files request", async () => {
      const now = new Date("2026-10-05T00:00:00Z");
      const nextWeek = new Date("2026-10-12T00:00:00Z");

      mockWeeklyFindUnique.mockResolvedValueOnce({
        id: "w-1",
        title: "Việc tồn đọng",
        description: "Mô tả",
        assigneeId: "admin-1",
        weekStart: now,
        weekEnd: new Date("2026-10-11T23:59:59Z"),
      });

      mockWeeklyUpdate.mockResolvedValueOnce({
        id: "w-1",
        explanation: "Chưa kịp làm do quá tải",
      });

      mockWeeklyCreate.mockResolvedValueOnce({
        id: "w-carried",
        title: "Việc tồn đọng",
        description: "Mô tả (Chuyển tiếp)",
        assigneeId: "admin-1",
        weekStart: nextWeek,
        isCarriedOver: true,
      });

      mockRequestCreate.mockResolvedValueOnce({
        id: "req-1",
        type: "WEEKLY_TASK",
        status: "PENDING",
      });

      const res = await app.request("/api/manager-tasks/weekly/w-1/carry-over", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ explanation: "Chưa kịp làm do quá tải" }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.updatedTask.explanation).toBe("Chưa kịp làm do quá tải");
      expect(json.data.carriedOverTask.isCarriedOver).toBe(true);
      expect(mockRequestCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "WEEKLY_TASK",
            status: "PENDING",
          }),
        })
      );
    });
  });
});
