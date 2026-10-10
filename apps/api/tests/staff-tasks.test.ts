import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockStaffTaskFindMany,
  mockStaffTaskFindUnique,
  mockStaffTaskCreate,
  mockStaffTaskUpdate,
  mockStaffTaskDelete,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockStaffTaskFindMany: vi.fn(),
  mockStaffTaskFindUnique: vi.fn(),
  mockStaffTaskCreate: vi.fn(),
  mockStaffTaskUpdate: vi.fn(),
  mockStaffTaskDelete: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    staffTask: {
      findMany: mockStaffTaskFindMany,
      findUnique: mockStaffTaskFindUnique,
      create: mockStaffTaskCreate,
      update: mockStaffTaskUpdate,
      delete: mockStaffTaskDelete,
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../src/lib/cache", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue(undefined),
  getOrSetCache: vi.fn().mockImplementation((_k, _t, fn) => fn()),
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Staff Tasks REST Endpoints (/api/staff-tasks)", () => {
  let adminToken: string;
  let staffToken: string;
  let unauthorizedToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    adminToken = await signAccessToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });

    staffToken = await signAccessToken({
      sub: "staff-1",
      email: "staff1@example.com",
      role: "STAFF",
    });

    unauthorizedToken = await signAccessToken({
      sub: "staff-no-kpi",
      email: "nokpi@example.com",
      role: "STAFF",
    });
  });

  describe("GET /api/staff-tasks", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await app.request("/api/staff-tasks");
      expect(res.status).toBe(401);
    });

    it("returns 403 when staff has staffTasksAllowed: false", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "staff-no-kpi",
        role: "STAFF",
        staffTasksAllowed: false,
      });

      const res = await app.request("/api/staff-tasks", {
        headers: { Authorization: `Bearer ${unauthorizedToken}` },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it("returns tasks and users for admin", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "admin-1",
        role: "ADMIN",
        staffTasksAllowed: true,
      });

      const mockTasks = [
        {
          id: "task-1",
          title: "Đăng bài fb",
          status: "TODO",
          assignee: { id: "staff-1", name: "Staff 1", email: "staff1@example.com" },
          createdBy: { id: "admin-1", name: "Admin" },
        },
      ];
      const mockUsers = [
        {
          id: "staff-1",
          name: "Staff 1",
          email: "staff1@example.com",
          staffTasksAllowed: true,
        },
      ];

      mockStaffTaskFindMany.mockResolvedValueOnce(mockTasks);
      mockUserFindMany.mockResolvedValueOnce(mockUsers);

      const res = await app.request("/api/staff-tasks", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.tasks).toHaveLength(1);
      expect(data.data.users).toHaveLength(1);
      expect(data.tasks).toHaveLength(1);
      expect(data.users).toHaveLength(1);
    });
  });

  describe("POST /api/staff-tasks", () => {
    it("returns 403 if non-admin attempts to create task", async () => {
      const res = await app.request("/api/staff-tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Task by staff",
          assigneeId: "staff-1",
        }),
      });

      expect(res.status).toBe(403);
    });

    it("returns 400 if title is missing", async () => {
      const res = await app.request("/api/staff-tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "   ",
          assigneeId: "staff-1",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 if assignee does not have staffTasksAllowed: true", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "staff-1",
        name: "Staff 1",
        staffTasksAllowed: false,
      });

      const res = await app.request("/api/staff-tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Livestream",
          assigneeId: "staff-1",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("chưa được bật cấp quyền KPI");
    });

    it("successfully creates task for KPI-allowed assignee", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "staff-1",
        name: "Staff 1",
        email: "staff1@example.com",
        staffTasksAllowed: true,
      });

      const createdTask = {
        id: "new-task-1",
        title: "Livestream 2 buổi",
        description: "Live stream bán hàng",
        status: "TODO",
        assigneeId: "staff-1",
        createdById: "admin-1",
        assignee: { id: "staff-1", name: "Staff 1", email: "staff1@example.com" },
        createdBy: { id: "admin-1", name: "Admin" },
      };

      mockStaffTaskCreate.mockResolvedValueOnce(createdTask);

      const res = await app.request("/api/staff-tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Livestream 2 buổi",
          description: "Live stream bán hàng",
          assigneeId: "staff-1",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.task.id).toBe("new-task-1");
      expect(mockStaffTaskCreate).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/staff-tasks/:id", () => {
    it("returns 404 if task is not found", async () => {
      mockStaffTaskFindUnique.mockResolvedValueOnce(null);

      const res = await app.request("/api/staff-tasks/unknown-id", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      expect(res.status).toBe(404);
    });

    it("allows admin to approve task with note", async () => {
      mockStaffTaskFindUnique.mockResolvedValueOnce({
        id: "task-1",
        status: "DONE",
        assigneeId: "staff-1",
        assignee: { id: "staff-1", name: "Staff 1" },
        createdBy: { id: "admin-1", name: "Admin" },
      });

      const updated = {
        id: "task-1",
        status: "APPROVED",
        adminNote: "Làm tốt lắm",
        completedAt: new Date(),
        assignee: { id: "staff-1", name: "Staff 1" },
        createdBy: { id: "admin-1", name: "Admin" },
      };

      mockStaffTaskUpdate.mockResolvedValueOnce(updated);

      const res = await app.request("/api/staff-tasks/task-1", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "APPROVED",
          adminNote: "Làm tốt lắm",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.task.status).toBe("APPROVED");
    });

    it("allows staff to submit task as DONE with evidence link and note", async () => {
      mockStaffTaskFindUnique.mockResolvedValueOnce({
        id: "task-1",
        status: "DOING",
        assigneeId: "staff-1",
        assignee: { id: "staff-1", name: "Staff 1" },
        createdBy: { id: "admin-1", name: "Admin" },
      });

      mockUserFindUnique.mockResolvedValueOnce({
        id: "staff-1",
        staffTasksAllowed: true,
      });

      const updated = {
        id: "task-1",
        status: "DONE",
        evidenceLink: "https://fb.com/post/123",
        evidenceNote: "Đã đăng xong bài",
        submittedAt: new Date(),
        assignee: { id: "staff-1", name: "Staff 1" },
        createdBy: { id: "admin-1", name: "Admin" },
      };

      mockStaffTaskUpdate.mockResolvedValueOnce(updated);

      const res = await app.request("/api/staff-tasks/task-1", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${staffToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "DONE",
          evidenceLink: "https://fb.com/post/123",
          evidenceNote: "Đã đăng xong bài",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.task.status).toBe("DONE");
    });
  });

  describe("DELETE /api/staff-tasks/:id", () => {
    it("returns 403 for non-admin", async () => {
      const res = await app.request("/api/staff-tasks/task-1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("deletes task successfully for admin", async () => {
      mockStaffTaskFindUnique.mockResolvedValueOnce({ id: "task-1" });
      mockStaffTaskDelete.mockResolvedValueOnce({ id: "task-1" });

      const res = await app.request("/api/staff-tasks/task-1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockStaffTaskDelete).toHaveBeenCalledWith({ where: { id: "task-1" } });
    });
  });

  describe("GET /api/staff-tasks/stats", () => {
    it("calculates stats for allowed users", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: "admin-1",
        role: "ADMIN",
        staffTasksAllowed: true,
      });

      mockUserFindMany.mockResolvedValueOnce([{ id: "staff-1" }]);

      mockStaffTaskFindMany.mockResolvedValueOnce([
        {
          id: "task-1",
          status: "APPROVED",
          assigneeId: "staff-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "task-2",
          status: "DOING",
          assigneeId: "staff-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await app.request("/api/staff-tasks/stats?userId=staff-1", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.monthly).toBeDefined();
      expect(data.weekly).toBeDefined();
    });
  });
});
