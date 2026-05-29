import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  getStaffTasks, 
  createStaffTask, 
  updateStaffTask, 
  deleteStaffTask, 
  toggleUserStaffTasksAllowed,
  getStaffTaskPerformanceStats
} from "@/actions/staff-task-actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    staffTask: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockTaskFindMany = prisma.staffTask.findMany as ReturnType<typeof vi.fn>;
const mockTaskCreate = prisma.staffTask.create as ReturnType<typeof vi.fn>;
const mockTaskUpdate = prisma.staffTask.update as ReturnType<typeof vi.fn>;
const mockTaskDelete = prisma.staffTask.delete as ReturnType<typeof vi.fn>;
const mockTaskFindUnique = prisma.staffTask.findUnique as ReturnType<typeof vi.fn>;

describe("Staff Tasks Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStaffTasks", () => {
    it("throws unauthorized error if user session is missing", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const res = await getStaffTasks();
      expect(res.success).toBe(false);
      expect(res.error).toContain("Unauthorized");
    });

    it("fetches tasks for a normal employee who is allowed", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "staff-1", role: "USER", staffTasksAllowed: true });
      mockTaskFindMany.mockResolvedValue([{ id: "task-1", title: "Write thread posts" }]);

      const res = await getStaffTasks();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assigneeId: "staff-1" }
        })
      );
    });

    it("blocks access for a normal employee who is NOT allowed", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "staff-1", role: "USER", staffTasksAllowed: false });

      const res = await getStaffTasks();
      expect(res.success).toBe(false);
      expect(res.error).toContain("không có quyền truy cập");
    });

    it("allows admin to fetch all tasks", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "admin@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
      mockTaskFindMany.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);

      const res = await getStaffTasks();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(mockTaskFindMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: expect.any(Object)
      });
    });
  });

  describe("createStaffTask", () => {
    it("allows admin to create tasks", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "admin@example.com", id: "admin-1", role: "ADMIN" } });
      mockTaskCreate.mockResolvedValue({ id: "task-new" });

      const res = await createStaffTask({
        title: "TikTok Video",
        assigneeId: "staff-1"
      });

      expect(res.success).toBe(true);
      expect(mockTaskCreate).toHaveBeenCalled();
    });

    it("prevents non-admins from creating tasks", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com", role: "USER" } });
      const res = await createStaffTask({ title: "No", assigneeId: "staff-1" });
      expect(res.success).toBe(false);
    });
  });

  describe("updateStaffTask", () => {
    it("allows admin to update all fields", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "admin@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
      mockTaskFindUnique.mockResolvedValue({ id: "task-1", assigneeId: "staff-1" });
      mockTaskUpdate.mockResolvedValue({ id: "task-1", title: "Updated Title" });

      const res = await updateStaffTask("task-1", { title: "Updated Title" });
      expect(res.success).toBe(true);
      expect(mockTaskUpdate).toHaveBeenCalled();
    });

    it("allows staff to update status to DOING or DONE for their own tasks", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "staff-1", role: "USER", staffTasksAllowed: true });
      mockTaskFindUnique.mockResolvedValue({ id: "task-1", assigneeId: "staff-1" });
      mockTaskUpdate.mockResolvedValue({ id: "task-1", status: "DONE" });

      const res = await updateStaffTask("task-1", { status: "DONE" });
      expect(res.success).toBe(true);
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DONE", submittedAt: expect.any(Date) })
        })
      );
    });

    it("prevents staff from updating fields other than status", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "staff@example.com" } });
      mockUserFindUnique.mockResolvedValue({ id: "staff-1", role: "USER", staffTasksAllowed: true });
      mockTaskFindUnique.mockResolvedValue({ id: "task-1", assigneeId: "staff-1" });

      const res = await updateStaffTask("task-1", { title: "Hacked" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("chỉ có quyền cập nhật trạng thái");
    });
  });

  describe("toggleUserStaffTasksAllowed", () => {
    it("allows admin to toggle permission", async () => {
      mockGetServerSession.mockResolvedValue({ user: { email: "admin@example.com", role: "ADMIN" } });
      mockUserUpdate.mockResolvedValue({});

      const res = await toggleUserStaffTasksAllowed("staff-1", true);
      expect(res.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "staff-1" },
        data: { staffTasksAllowed: true }
      });
    });
  });

  describe("getStaffTaskPerformanceStats", () => {
    it("calculates correct statistics based on task list", async () => {
      mockTaskFindMany.mockResolvedValue([
        { id: "t1", status: "APPROVED" },
        { id: "t2", status: "DOING" },
        { id: "t3", status: "TODO" }
      ]);

      const res = await getStaffTaskPerformanceStats("staff-1");
      expect(res.success).toBe(true);
      expect(res.data?.monthly.total).toBe(3);
      expect(res.data?.monthly.approved).toBe(1);
      expect(res.data?.monthly.completionRate).toBe(1/3);
    });
  });
});
