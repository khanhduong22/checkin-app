import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockTaskItemFindMany,
  mockTaskItemFindUnique,
  mockTaskItemCreate,
  mockTaskItemUpdate,
  mockTaskItemDelete,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockTaskItemFindMany: vi.fn(),
  mockTaskItemFindUnique: vi.fn(),
  mockTaskItemCreate: vi.fn(),
  mockTaskItemUpdate: vi.fn(),
  mockTaskItemDelete: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    taskItem: {
      findMany: mockTaskItemFindMany,
      findUnique: mockTaskItemFindUnique,
      create: mockTaskItemCreate,
      update: mockTaskItemUpdate,
      delete: mockTaskItemDelete,
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../src/lib/cache", () => ({
  invalidateCachePattern: vi.fn().mockResolvedValue(undefined),
  invalidatePayrollCache: vi.fn().mockResolvedValue(undefined),
  getOrSetCache: vi.fn().mockImplementation((_k, _t, fn) => fn()),
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Marketplace Task Items Endpoints", () => {
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

    mockUserFindUnique.mockImplementation(({ where }: any) => {
      if (where.id === "admin-1") {
        return Promise.resolve({
          id: "admin-1",
          email: "admin@example.com",
          role: "ADMIN",
          isActive: true,
        });
      }
      if (where.id === "staff-1") {
        return Promise.resolve({
          id: "staff-1",
          email: "staff@example.com",
          role: "STAFF",
          isActive: true,
        });
      }
      return Promise.resolve(null);
    });
  });

  describe("GET /api/tasks/items & /api/admin/tasks/items", () => {
    it("returns 401 without auth", async () => {
      const res = await app.request("/api/tasks/items", {
        method: "GET",
      });
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin user", async () => {
      const res = await app.request("/api/tasks/items", {
        method: "GET",
        headers: { Cookie: `access_token=${staffToken}` },
      });
      expect(res.status).toBe(403);
    });

    it("returns all task items ordered by createdAt desc", async () => {
      const fakeItems = [
        {
          id: "item-1",
          taskDefId: "def-1",
          title: "Đóng gói đợt 1",
          description: "Mô tả việc đóng gói",
          deadline: new Date("2026-10-15T12:00:00Z"),
          status: "OPEN",
          assigneeId: null,
          createdAt: new Date("2026-10-06T10:00:00Z"),
          updatedAt: new Date("2026-10-06T10:00:00Z"),
          taskDefinition: {
            id: "def-1",
            name: "Đóng gói hộp quà",
            baseReward: 5000,
            unit: "hộp",
          },
          assignee: null,
        },
      ];

      mockTaskItemFindMany.mockResolvedValue(fakeItems);

      const res = await app.request("/api/tasks/items", {
        method: "GET",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Đóng gói đợt 1");
      expect(mockTaskItemFindMany).toHaveBeenCalledWith({
        include: {
          taskDefinition: true,
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("works via admin route /api/admin/tasks/items", async () => {
      mockTaskItemFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/tasks/items", {
        method: "GET",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe("POST /api/tasks/items & /api/admin/tasks/items", () => {
    it("validates required fields (taskDefId, title)", async () => {
      const res = await app.request("/api/tasks/items", {
        method: "POST",
        headers: {
          Cookie: `access_token=${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("creates a task item successfully with status OPEN", async () => {
      const createdItem = {
        id: "item-new",
        taskDefId: "def-1",
        title: "Sửa lỗi UI #456",
        description: "Chi tiết yêu cầu",
        deadline: new Date("2026-10-20T17:00:00Z"),
        status: "OPEN",
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        taskDefinition: {
          id: "def-1",
          name: "Sửa lỗi",
          baseReward: 50000,
          unit: "bug",
        },
        assignee: null,
      };

      mockTaskItemCreate.mockResolvedValue(createdItem);

      const res = await app.request("/api/tasks/items", {
        method: "POST",
        headers: {
          Cookie: `access_token=${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskDefId: "def-1",
          title: "Sửa lỗi UI #456",
          description: "Chi tiết yêu cầu",
          deadline: "2026-10-20T17:00:00Z",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("item-new");
      expect(body.data.status).toBe("OPEN");
      expect(mockTaskItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskDefId: "def-1",
            title: "Sửa lỗi UI #456",
            status: "OPEN",
          }),
        })
      );
    });

    it("works via admin route /api/admin/tasks/items", async () => {
      mockTaskItemCreate.mockResolvedValue({
        id: "item-admin",
        title: "Test Admin",
        status: "OPEN",
      });

      const res = await app.request("/api/admin/tasks/items", {
        method: "POST",
        headers: {
          Cookie: `access_token=${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskDefId: "def-1",
          title: "Test Admin",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("item-admin");
    });
  });

  describe("PATCH /api/tasks/items/:id", () => {
    it("returns 404 when item does not exist", async () => {
      mockTaskItemFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/tasks/items/not-exist", {
        method: "PATCH",
        headers: {
          Cookie: `access_token=${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated" }),
      });

      expect(res.status).toBe(404);
    });

    it("updates item fields successfully", async () => {
      mockTaskItemFindUnique.mockResolvedValue({ id: "item-1" });
      mockTaskItemUpdate.mockResolvedValue({
        id: "item-1",
        title: "Updated Title",
        status: "OPEN",
      });

      const res = await app.request("/api/tasks/items/item-1", {
        method: "PATCH",
        headers: {
          Cookie: `access_token=${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Updated Title",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Updated Title");
    });
  });

  describe("POST /api/tasks/items/:id/close & /api/admin/tasks/items/:id/close", () => {
    it("returns 404 when closing non-existent item", async () => {
      mockTaskItemFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/tasks/items/not-exist/close", {
        method: "POST",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it("closes task item and sets status to CLOSED", async () => {
      mockTaskItemFindUnique.mockResolvedValue({ id: "item-1", status: "OPEN" });
      mockTaskItemUpdate.mockResolvedValue({
        id: "item-1",
        status: "CLOSED",
      });

      const res = await app.request("/api/admin/tasks/items/item-1/close", {
        method: "POST",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("CLOSED");
      expect(mockTaskItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { status: "CLOSED" },
        })
      );
    });
  });

  describe("POST /api/tasks/items/:id/reset & /api/admin/tasks/items/:id/reset", () => {
    it("returns 404 when resetting non-existent item", async () => {
      mockTaskItemFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/tasks/items/not-exist/reset", {
        method: "POST",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it("resets task item to status OPEN and assigneeId null", async () => {
      mockTaskItemFindUnique.mockResolvedValue({
        id: "item-1",
        status: "IN_PROGRESS",
        assigneeId: "user-1",
      });
      mockTaskItemUpdate.mockResolvedValue({
        id: "item-1",
        status: "OPEN",
        assigneeId: null,
      });

      const res = await app.request("/api/admin/tasks/items/item-1/reset", {
        method: "POST",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("OPEN");
      expect(body.data.assigneeId).toBeNull();
      expect(mockTaskItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { status: "OPEN", assigneeId: null },
        })
      );
    });
  });

  describe("DELETE /api/tasks/items/:id & /api/admin/tasks/items/:id", () => {
    it("returns 404 when deleting non-existent item", async () => {
      mockTaskItemFindUnique.mockResolvedValue(null);

      const res = await app.request("/api/tasks/items/not-exist", {
        method: "DELETE",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(404);
    });

    it("deletes task item successfully", async () => {
      mockTaskItemFindUnique.mockResolvedValue({ id: "item-1" });
      mockTaskItemDelete.mockResolvedValue({ id: "item-1" });

      const res = await app.request("/api/admin/tasks/items/item-1", {
        method: "DELETE",
        headers: { Cookie: `access_token=${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockTaskItemDelete).toHaveBeenCalledWith({
        where: { id: "item-1" },
      });
    });
  });
});
