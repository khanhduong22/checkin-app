import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserCount,
  mockUserFindMany,
  mockUserFindUnique,
  mockUserCreate,
  mockUserUpdate,
  mockUserDelete,
  mockSessionDeleteMany,
  mockAllowedIPCount,
  mockAllowedIPFindMany,
  mockAllowedIPCreate,
  mockAllowedIPDelete,
  mockRequestCount,
  mockRequestFindMany,
  mockRequestUpdate,
  mockCheckInFindMany,
  mockCheckInDeleteMany,
  mockCheckInCreate,
  mockWorkShiftFindMany,
  mockWorkShiftCreateMany,
  mockWorkShiftCreate,
  mockWorkShiftUpdate,
  mockWorkShiftDelete,
  mockWorkShiftDeleteMany,
  mockWorkShiftFindUnique,
  mockShiftAuditLogCreate,
  mockShiftAuditLogFindMany,
  mockShiftAuditLogCount,
  mockAnnouncementFindMany,
  mockAnnouncementCreate,
  mockAnnouncementDelete,
  mockSessionAuditLogCount,
  mockSessionAuditLogFindMany,
  mockHolidayFindMany,
  mockPayrollPeriodFindUnique,
} = vi.hoisted(() => ({
  mockUserCount: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserDelete: vi.fn(),
  mockSessionDeleteMany: vi.fn(),
  mockAllowedIPCount: vi.fn(),
  mockAllowedIPFindMany: vi.fn(),
  mockAllowedIPCreate: vi.fn(),
  mockAllowedIPDelete: vi.fn(),
  mockRequestCount: vi.fn(),
  mockRequestFindMany: vi.fn(),
  mockRequestUpdate: vi.fn(),
  mockCheckInFindMany: vi.fn(),
  mockCheckInDeleteMany: vi.fn(),
  mockCheckInCreate: vi.fn(),
  mockWorkShiftFindMany: vi.fn(),
  mockWorkShiftCreateMany: vi.fn(),
  mockWorkShiftCreate: vi.fn(),
  mockWorkShiftUpdate: vi.fn(),
  mockWorkShiftDelete: vi.fn(),
  mockWorkShiftDeleteMany: vi.fn(),
  mockWorkShiftFindUnique: vi.fn(),
  mockShiftAuditLogCreate: vi.fn(),
  mockShiftAuditLogFindMany: vi.fn(),
  mockShiftAuditLogCount: vi.fn(),
  mockAnnouncementFindMany: vi.fn(),
  mockAnnouncementCreate: vi.fn(),
  mockAnnouncementDelete: vi.fn(),
  mockSessionAuditLogCount: vi.fn(),
  mockSessionAuditLogFindMany: vi.fn(),
  mockHolidayFindMany: vi.fn(),
  mockPayrollPeriodFindUnique: vi.fn(),
}));

vi.mock("@checkin/db", () => ({
  prisma: {
    user: {
      count: mockUserCount,
      findMany: mockUserFindMany,
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
      delete: mockUserDelete,
    },
    session: {
      deleteMany: mockSessionDeleteMany,
    },
    allowedIP: {
      count: mockAllowedIPCount,
      findMany: mockAllowedIPFindMany,
      create: mockAllowedIPCreate,
      delete: mockAllowedIPDelete,
    },
    request: {
      count: mockRequestCount,
      findMany: mockRequestFindMany,
      update: mockRequestUpdate,
    },
    checkIn: {
      findMany: mockCheckInFindMany,
      deleteMany: mockCheckInDeleteMany,
      create: mockCheckInCreate,
    },
    workShift: {
      findMany: mockWorkShiftFindMany,
      createMany: mockWorkShiftCreateMany,
      create: mockWorkShiftCreate,
      update: mockWorkShiftUpdate,
      delete: mockWorkShiftDelete,
      deleteMany: mockWorkShiftDeleteMany,
      findUnique: mockWorkShiftFindUnique,
    },
    shiftAuditLog: {
      findMany: mockShiftAuditLogFindMany,
      count: mockShiftAuditLogCount,
      create: mockShiftAuditLogCreate,
    },
    announcement: {
      findMany: mockAnnouncementFindMany,
      create: mockAnnouncementCreate,
      delete: mockAnnouncementDelete,
    },
    sessionAuditLog: {
      count: mockSessionAuditLogCount,
      findMany: mockSessionAuditLogFindMany,
      create: vi.fn().mockResolvedValue({ id: "audit-admin" }),
    },
    holiday: {
      findMany: mockHolidayFindMany,
    },
    payrollPeriod: {
      findUnique: mockPayrollPeriodFindUnique,
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { app } from "../src/app";
import { signAccessToken } from "../src/lib/auth";

describe("Admin Routes", () => {
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adminToken = await signAccessToken({
      sub: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });
    userToken = await signAccessToken({
      sub: "user-1",
      email: "user@example.com",
      role: "USER",
    });
  });

  describe("Permission Guard", () => {
    it("returns 403 when user is not ADMIN", async () => {
      const res = await app.request("/api/admin/users", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/dashboard", () => {
    it("returns dashboard aggregate statistics", async () => {
      mockUserCount.mockResolvedValue(10);
      mockAllowedIPCount.mockResolvedValue(2);
      mockRequestCount.mockResolvedValue(3);
      mockCheckInFindMany.mockResolvedValue([]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);
      mockHolidayFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.userCount).toBe(10);
      expect(data.data.ipCount).toBe(2);
      expect(data.data.pendingRequests).toBe(3);
      expect(data.data.payrollSummary).toBeDefined();
    });
  });

  describe("GET /api/admin/dashboard-stats", () => {
    it("returns calculated dashboard stats format for admin", async () => {
      mockUserCount.mockResolvedValue(12);
      mockRequestCount.mockResolvedValue(4);
      mockCheckInFindMany.mockResolvedValue([
        { id: 1, userId: "u-1", type: "checkin", timestamp: new Date() },
        { id: 2, userId: "u-1", type: "checkout", timestamp: new Date() },
      ]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockUserFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/dashboard-stats", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.todayCheckinCount).toBe(1);
      expect(data.todayCheckoutCount).toBe(1);
      expect(data.pendingRequestsCount).toBe(4);
      expect(data.totalEmployeesCount).toBe(12);
      expect(data.onTimeRate).toBeDefined();
      expect(data.lateRate).toBeDefined();
      expect(data.data.todayCheckinCount).toBe(1);
    });
  });

  describe("Users Management", () => {
    it("GET /api/admin/users returns list of all users", async () => {
      mockUserFindMany.mockResolvedValue([
        { id: "u-1", name: "Alice", email: "alice@example.com", role: "USER" },
      ]);

      const res = await app.request("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("POST /api/admin/users creates a new user", async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        id: "u-new",
        name: "Bob",
        email: "bob@example.com",
        role: "USER",
      });

      const res = await app.request("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Bob",
          email: "bob@example.com",
          employmentType: "PART_TIME",
          hourlyRate: 30000,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe("bob@example.com");
    });

    it("PUT /api/admin/users/:id updates user details", async () => {
      mockUserUpdate.mockResolvedValue({
        id: "u-1",
        name: "Alice Updated",
        role: "ADMIN",
      });

      const res = await app.request("/api/admin/users/u-1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "Alice Updated",
          role: "ADMIN",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalled();
    });

    it("DELETE /api/admin/users/:id deletes user", async () => {
      mockUserDelete.mockResolvedValue({ id: "u-1" });

      const res = await app.request("/api/admin/users/u-1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUserDelete).toHaveBeenCalled();
    });
  });

  describe("IP Settings", () => {
    it("GET /api/admin/ip-settings returns list of IPs", async () => {
      mockAllowedIPFindMany.mockResolvedValue([
        { id: 1, prefix: "192.168.1.", label: "Office" },
      ]);

      const res = await app.request("/api/admin/ip-settings", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("POST /api/admin/ip-settings adds new IP", async () => {
      mockAllowedIPCreate.mockResolvedValue({
        id: 2,
        prefix: "10.0.0.",
        label: "Store",
      });

      const res = await app.request("/api/admin/ip-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ prefix: "10.0.0.", label: "Store" }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.prefix).toBe("10.0.0.");
    });

    it("DELETE /api/admin/ip-settings/:id removes IP", async () => {
      mockAllowedIPDelete.mockResolvedValue({ id: 2 });

      const res = await app.request("/api/admin/ip-settings/2", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockAllowedIPDelete).toHaveBeenCalled();
    });
  });

  describe("Manual Checkin", () => {
    it("POST /api/admin/manual-checkin overrides checkin records", async () => {
      mockCheckInDeleteMany.mockResolvedValue({ count: 1 });
      mockCheckInCreate.mockResolvedValue({ id: 10 });

      const res = await app.request("/api/admin/manual-checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: "u-1",
          date: "2026-10-02",
          checkInTime: "08:30",
          checkOutTime: "17:30",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockCheckInDeleteMany).toHaveBeenCalled();
      expect(mockCheckInCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe("Requests Management", () => {
    it("GET /api/admin/requests returns requests with user details", async () => {
      mockRequestFindMany.mockResolvedValue([
        {
          id: 5,
          userId: "u-1",
          type: "LEAVE",
          status: "PENDING",
          user: { id: "u-1", name: "Alice", email: "alice@example.com" },
        },
      ]);

      const res = await app.request("/api/admin/requests", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data[0].user.name).toBe("Alice");
    });

    it("POST /api/admin/requests/:id/action approves request", async () => {
      mockRequestUpdate.mockResolvedValue({ id: 5, status: "APPROVED" });

      const res = await app.request("/api/admin/requests/5/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "APPROVED" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockRequestUpdate).toHaveBeenCalled();
    });
  });

  describe("Announcements Management", () => {
    it("GET /api/admin/announcements lists announcements", async () => {
      mockAnnouncementFindMany.mockResolvedValue([
        { id: "a-1", title: "Thông báo mới", content: "Nội dung" },
      ]);

      const res = await app.request("/api/admin/announcements", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
    });

    it("POST /api/admin/announcements creates announcement", async () => {
      mockAnnouncementCreate.mockResolvedValue({
        id: "a-2",
        title: "Họp công ty",
        content: "Thứ 2",
        type: "INFO",
      });

      const res = await app.request("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: "Họp công ty",
          content: "Thứ 2",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockAnnouncementCreate).toHaveBeenCalled();
    });

    it("DELETE /api/admin/announcements/:id deletes announcement", async () => {
      mockAnnouncementDelete.mockResolvedValue({ id: "a-2" });

      const res = await app.request("/api/admin/announcements/a-2", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockAnnouncementDelete).toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/audit-logs", () => {
    it("returns paginated session audit logs for admin", async () => {
      mockSessionAuditLogCount.mockResolvedValue(1);
      mockSessionAuditLogFindMany.mockResolvedValue([
        {
          id: "log-1",
          action: "LOGIN",
          status: "SUCCESS",
          ipAddress: "127.0.0.1",
          user: { id: "u-1", name: "Alice" },
        },
      ]);

      const res = await app.request("/api/auth/audit-logs?page=1&limit=10", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.total).toBe(1);
      expect(data.logs).toHaveLength(1);
    });
  });

  describe("GET /api/admin/payroll", () => {
    it("returns payroll data for all active users", async () => {
      mockUserFindMany.mockResolvedValue([
        {
          id: "u-1",
          name: "Alice",
          email: "alice@example.com",
          hourlyRate: 30000,
          monthlySalary: 6000000,
          employmentType: "PART_TIME",
        },
      ]);

      const res = await app.request("/api/admin/payroll?month=10&year=2026", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].userName).toBe("Alice");
    });
  });

  describe("New Admin Endpoints", () => {
    it("GET /api/admin/employees/:id returns employee detail with stats", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: "u-1",
        name: "Alice",
        email: "alice@example.com",
        role: "USER",
        employmentType: "PART_TIME",
        hourlyRate: 30000,
        monthlySalary: 6000000,
        achievements: [],
        adjustments: [],
        requests: [],
        payslips: [],
      });

      const res = await app.request("/api/admin/employees/u-1?month=10&year=2026", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.user.name).toBe("Alice");
      expect(data.data.stats).toBeDefined();
    });

    it("PATCH /api/admin/employees/:id/status updates active status", async () => {
      mockUserUpdate.mockResolvedValue({
        id: "u-1",
        name: "Alice",
        isActive: false,
      });

      const res = await app.request("/api/admin/employees/u-1/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isActive: false }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u-1" }, data: { isActive: false } })
      );
    });

    it("POST /api/admin/requests/:id/approve updates request to APPROVED", async () => {
      mockRequestUpdate.mockResolvedValue({ id: 10, status: "APPROVED" });

      const res = await app.request("/api/admin/requests/10/approve", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Đã duyệt đơn");
      expect(mockRequestUpdate).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: "APPROVED" },
      });
    });

    it("POST /api/admin/requests/:id/reject updates request to REJECTED", async () => {
      mockRequestUpdate.mockResolvedValue({ id: 10, status: "REJECTED" });

      const res = await app.request("/api/admin/requests/10/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: "Bận ca" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Đã từ chối đơn");
      expect(mockRequestUpdate).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: "REJECTED" },
      });
    });

    it("PATCH /api/admin/lucky-wheel/allowed/:userId updates user permission", async () => {
      mockUserUpdate.mockResolvedValue({
        id: "u-1",
        name: "Alice",
        luckyWheelAllowed: true,
      });

      const res = await app.request("/api/admin/lucky-wheel/allowed/u-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ allow: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u-1" }, data: { luckyWheelAllowed: true } })
      );
    });

    it("GET /api/admin/export returns an XLSX spreadsheet", async () => {
      mockUserFindMany.mockResolvedValue([
        { id: "u-1", name: "Alice", email: "alice@example.com", role: "USER", employmentType: "PART_TIME", hourlyRate: 30000, isActive: true },
      ]);
      mockCheckInFindMany.mockResolvedValue([]);
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockRequestFindMany.mockResolvedValue([]);

      const res = await app.request("/api/admin/export?from=2026-10-01&to=2026-10-31", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("spreadsheetml");
    });
  });

  describe("Schedule Management Endpoints", () => {
    it("GET /api/admin/schedule returns formatted events with duties and user info", async () => {
      mockWorkShiftFindMany.mockResolvedValue([
        {
          id: 101,
          userId: "u-1",
          start: new Date("2026-10-05T08:00:00Z"),
          end: new Date("2026-10-05T17:00:00Z"),
          shiftType: "FULL",
          status: "APPROVED",
          isSenior: true,
          isOpenForSwap: false,
          user: {
            id: "u-1",
            name: "Alice",
            image: null,
            email: "alice@example.com",
            role: "USER",
            employmentType: "PART_TIME",
          },
          duties: [
            { id: "duty-1", title: "Mở cửa", isCompleted: true },
          ],
        },
      ]);

      const res = await app.request("/api/admin/schedule?month=10&year=2026", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Alice");
      expect(body.data[0].isSenior).toBe(true);
      expect(body.data[0].duties).toHaveLength(1);
    });

    it("POST /api/admin/schedule creates a new work shift", async () => {
      mockWorkShiftCreate.mockResolvedValue({
        id: 102,
        userId: "u-1",
        start: new Date("2026-10-06T08:00:00Z"),
        end: new Date("2026-10-06T17:00:00Z"),
        shiftType: "FULL",
        status: "APPROVED",
        isSenior: false,
        user: { id: "u-1", name: "Alice", image: null, email: "alice@example.com", role: "USER", employmentType: "PART_TIME" },
        duties: [],
      });
      mockShiftAuditLogCreate.mockResolvedValue({ id: 1 });

      const res = await app.request("/api/admin/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: "u-1",
          start: "2026-10-06T08:00:00Z",
          end: "2026-10-06T17:00:00Z",
          shiftType: "FULL",
          isSenior: false,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(102);
    });

    it("PUT /api/admin/schedule/:id updates shift on drag & drop", async () => {
      mockWorkShiftFindUnique.mockResolvedValue({
        id: 102,
        userId: "u-1",
        start: new Date("2026-10-06T08:00:00Z"),
        end: new Date("2026-10-06T17:00:00Z"),
      });
      mockWorkShiftUpdate.mockResolvedValue({
        id: 102,
        userId: "u-1",
        start: new Date("2026-10-06T09:00:00Z"),
        end: new Date("2026-10-06T18:00:00Z"),
        user: { id: "u-1", name: "Alice", image: null, email: "alice@example.com", role: "USER", employmentType: "PART_TIME" },
        duties: [],
      });
      mockShiftAuditLogCreate.mockResolvedValue({ id: 2 });

      const res = await app.request("/api/admin/schedule/102", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          start: "2026-10-06T09:00:00Z",
          end: "2026-10-06T18:00:00Z",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(102);
    });

    it("DELETE /api/admin/schedule/:id deletes a shift", async () => {
      mockWorkShiftFindUnique.mockResolvedValue({
        id: 102,
        userId: "u-1",
        start: new Date("2026-10-06T08:00:00Z"),
        end: new Date("2026-10-06T17:00:00Z"),
      });
      mockWorkShiftDelete.mockResolvedValue({ id: 102 });
      mockShiftAuditLogCreate.mockResolvedValue({ id: 3 });

      const res = await app.request("/api/admin/schedule/102", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("PATCH /api/admin/schedule/:id/senior toggles senior crown", async () => {
      mockWorkShiftFindUnique.mockResolvedValue({
        id: 103,
        userId: "u-1",
        start: new Date("2026-10-07T08:00:00Z"),
        end: new Date("2026-10-07T17:00:00Z"),
        user: { name: "Alice", email: "alice@example.com" },
      });
      mockWorkShiftFindMany.mockResolvedValue([]);
      mockWorkShiftUpdate.mockResolvedValue({
        id: 103,
        userId: "u-1",
        isSenior: true,
        user: { id: "u-1", name: "Alice", image: null, email: "alice@example.com", role: "USER", employmentType: "PART_TIME" },
        duties: [],
      });
      mockShiftAuditLogCreate.mockResolvedValue({ id: 4 });

      const res = await app.request("/api/admin/schedule/103/senior", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isSenior: true }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.isSenior).toBe(true);
    });

    it("POST /api/admin/schedule/upload imports shifts from parsed items", async () => {
      mockUserFindMany.mockResolvedValue([
        { id: "u-1", name: "Alice", email: "alice@example.com" },
      ]);
      mockWorkShiftDeleteMany.mockResolvedValue({ count: 1 });
      mockWorkShiftCreate.mockResolvedValue({
        id: 104,
        userId: "u-1",
        start: new Date(),
        end: new Date(),
      });
      mockShiftAuditLogCreate.mockResolvedValue({ id: 5 });

      const res = await app.request("/api/admin/schedule/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          shifts: [
            {
              dateIso: "2026-10-08T00:00:00.000Z",
              startHour: 8,
              endHour: 17,
              names: ["Alice"],
            },
          ],
          overrideExisting: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(1);
    });

    it("GET /api/admin/schedule/history returns audit logs", async () => {
      mockShiftAuditLogFindMany.mockResolvedValue([
        {
          id: 1,
          shiftId: 101,
          action: "CREATE",
          createdAt: new Date(),
          user: { id: "u-1", name: "Alice", email: "alice@example.com" },
          changedBy: { id: "admin-1", name: "Admin", email: "admin@example.com" },
        },
      ]);
      mockShiftAuditLogCount.mockResolvedValue(1);

      const res = await app.request("/api/admin/schedule/history?page=1&pageSize=50", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });
});
