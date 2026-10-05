import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createShiftDuty,
  updateShiftDuty,
  deleteShiftDuty,
  toggleCompleteShiftDuty,
  getTodayUserShiftDuties,
  getTodayShiftDutiesWithTeammates,
  getShiftDutiesForShift,
  getUserUpcomingShifts,
} from "@/actions/shift-duty-actions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    shiftDuty: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    workShift: {
      findMany: vi.fn(),
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
const mockDutyFindMany = prisma.shiftDuty.findMany as ReturnType<typeof vi.fn>;
const mockDutyCreate = prisma.shiftDuty.create as ReturnType<typeof vi.fn>;
const mockDutyUpdate = prisma.shiftDuty.update as ReturnType<typeof vi.fn>;
const mockDutyDelete = prisma.shiftDuty.delete as ReturnType<typeof vi.fn>;
const mockDutyFindUnique = prisma.shiftDuty.findUnique as ReturnType<typeof vi.fn>;
const mockWorkShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockWorkShiftFindUnique = prisma.workShift.findUnique as ReturnType<typeof vi.fn>;

describe("Shift Duty Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createShiftDuty", () => {
    it("should allow ADMIN to create shift duty successfully", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@limart.com", role: "ADMIN" },
      });
      mockUserFindUnique.mockResolvedValue({
        id: "admin-1",
        email: "admin@limart.com",
        role: "ADMIN",
      });
      mockDutyCreate.mockResolvedValue({
        id: "duty-1",
        title: "Kiểm tra date bánh",
        description: "Kiểm tra toàn bộ hạn sử dụng tủ mát",
        userId: "user-1",
        shiftId: 10,
        isCompleted: false,
      });

      const res = await createShiftDuty({
        title: "Kiểm tra date bánh",
        description: "Kiểm tra toàn bộ hạn sử dụng tủ mát",
        userId: "user-1",
        shiftId: 10,
        date: new Date(),
      });

      expect(res.success).toBe(true);
      expect(res.data?.id).toBe("duty-1");
      expect(mockDutyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Kiểm tra date bánh",
            userId: "user-1",
            shiftId: 10,
          }),
        })
      );
    });

    it("should reject non-admin users from creating duties", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "staff@limart.com", role: "STAFF" },
      });

      const res = await createShiftDuty({
        title: "Dọn dẹp quầy",
        userId: "user-2",
        date: new Date(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Unauthorized");
    });

    it("should reject empty duty title", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@limart.com", role: "ADMIN" },
      });
      mockUserFindUnique.mockResolvedValue({
        id: "admin-1",
        email: "admin@limart.com",
        role: "ADMIN",
      });

      const res = await createShiftDuty({
        title: "   ",
        userId: "user-1",
        date: new Date(),
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Tiêu đề công việc không được để trống");
    });
  });

  describe("updateShiftDuty", () => {
    it("should allow ADMIN to update duty title and description", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@limart.com", role: "ADMIN" },
      });
      mockDutyUpdate.mockResolvedValue({
        id: "duty-1",
        title: "Tên mới",
        description: "Mô tả mới",
      });

      const res = await updateShiftDuty("duty-1", {
        title: "Tên mới",
        description: "Mô tả mới",
      });

      expect(res.success).toBe(true);
      expect(res.data?.title).toBe("Tên mới");
      expect(mockDutyUpdate).toHaveBeenCalledWith({
        where: { id: "duty-1" },
        data: {
          title: "Tên mới",
          description: "Mô tả mới",
        },
      });
    });
  });

  describe("deleteShiftDuty", () => {
    it("should allow ADMIN to delete a duty", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@limart.com", role: "ADMIN" },
      });
      mockDutyDelete.mockResolvedValue({ id: "duty-1" });

      const res = await deleteShiftDuty("duty-1");

      expect(res.success).toBe(true);
      expect(mockDutyDelete).toHaveBeenCalledWith({ where: { id: "duty-1" } });
    });
  });

  describe("toggleCompleteShiftDuty", () => {
    it("should allow assignee to toggle completion status", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "staff@limart.com" },
      });
      mockUserFindUnique.mockResolvedValue({
        id: "user-1",
        email: "staff@limart.com",
        role: "STAFF",
      });
      mockDutyFindUnique.mockResolvedValue({
        id: "duty-1",
        userId: "user-1",
        isCompleted: false,
      });
      mockDutyUpdate.mockResolvedValue({
        id: "duty-1",
        userId: "user-1",
        isCompleted: true,
      });

      const res = await toggleCompleteShiftDuty("duty-1");

      expect(res.success).toBe(true);
      expect(res.data?.isCompleted).toBe(true);
      expect(mockDutyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "duty-1" },
          data: expect.objectContaining({ isCompleted: true }),
        })
      );
    });

    it("should deny staff from toggling someone else's duty", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "staff@limart.com" },
      });
      mockUserFindUnique.mockResolvedValue({
        id: "user-1",
        email: "staff@limart.com",
        role: "STAFF",
      });
      mockDutyFindUnique.mockResolvedValue({
        id: "duty-2",
        userId: "user-2",
        isCompleted: false,
      });

      const res = await toggleCompleteShiftDuty("duty-2");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Bạn không có quyền cập nhật nhiệm vụ này");
    });
  });

  describe("getTodayUserShiftDuties", () => {
    it("should return duties for the specified user today", async () => {
      const mockList = [
        { id: "duty-1", title: "Nhiệm vụ 1", isCompleted: false },
        { id: "duty-2", title: "Nhiệm vụ 2", isCompleted: true },
      ];
      mockDutyFindMany.mockResolvedValue(mockList);

      const res = await getTodayUserShiftDuties("user-1");

      expect(res.success).toBe(true);
      if (!res.success) return;
      expect(res.data).toHaveLength(2);
    });
  });

  describe("getTodayShiftDutiesWithTeammates", () => {
    it("should return user duties and group colleagues' duties", async () => {
      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 1,
          userId: "user-1",
          start: new Date("2026-09-28T08:00:00Z"),
          end: new Date("2026-09-28T12:00:00Z"),
          user: { id: "user-1", name: "Nguyễn Văn A" },
        },
        {
          id: 2,
          userId: "user-2",
          start: new Date("2026-09-28T08:00:00Z"),
          end: new Date("2026-09-28T12:00:00Z"),
          user: { id: "user-2", name: "Trần Thị B" },
        },
      ]);

      mockDutyFindMany.mockResolvedValue([
        { id: "d-1", userId: "user-1", title: "Việc của tôi", isCompleted: false },
        {
          id: "d-2",
          userId: "user-2",
          title: "Việc của bạn B",
          isCompleted: false,
          user: { id: "user-2", name: "Trần Thị B" },
        },
      ]);

      const res = await getTodayShiftDutiesWithTeammates("user-1");

      expect(res.success).toBe(true);
      if (!res.success) return;
      expect(res.data?.myDuties).toHaveLength(1);
      expect(res.data?.myDuties[0].title).toBe("Việc của tôi");
      expect(res.data?.colleagues).toHaveLength(1);
      expect(res.data?.colleagues[0].user.name).toBe("Trần Thị B");
      expect(res.data?.colleagues[0].duties).toHaveLength(1);
    });
  });

  describe("getShiftDutiesForShift", () => {
    it("should return duties matching the shift", async () => {
      mockWorkShiftFindUnique.mockResolvedValue({
        id: 10,
        userId: "user-1",
        start: new Date("2026-09-28T08:00:00Z"),
      });

      mockDutyFindMany.mockResolvedValue([
        { id: "duty-1", title: "Việc ca 10", shiftId: 10 },
      ]);

      const res = await getShiftDutiesForShift(10);

      expect(res.success).toBe(true);
      if (!res.success) return;
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].title).toBe("Việc ca 10");
    });
  });
});
