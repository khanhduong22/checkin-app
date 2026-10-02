import { Hono } from "hono";
import { prisma } from "@checkin/db";
import { z } from "zod";
import * as XLSX from "xlsx";
import { authMiddleware, adminMiddleware, AppEnv } from "../middleware/auth.middleware";
import { getVietnamDayRange, getVietnamMonthRange } from "../lib/date-utils";
import { calculateMonthlyPayrollSummary, calculateUserMonthlyStats } from "../lib/payroll-calculator";
import { getSpecialDays } from "../lib/special-days";

export const adminRoute = new Hono<AppEnv>();

// All admin routes require authentication and admin role
adminRoute.use("*", authMiddleware, adminMiddleware);

// ============================================================================
// ============================================================================
// 1. DASHBOARD
// ============================================================================
adminRoute.get("/dashboard", async (c) => {
  try {
    const { startOfDay, endOfDay } = getVietnamDayRange();

    const [userCount, ipCount, pendingRequests, checkinsRaw, todayShifts, payrollSummary, specialUsers, pendingTasksCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.allowedIP.count(),
        prisma.request.count({ where: { status: "PENDING" } }),
        prisma.checkIn.findMany({
          where: { timestamp: { gte: startOfDay, lte: endOfDay } },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true },
            },
          },
          orderBy: { timestamp: "asc" },
        }),
        prisma.workShift.findMany({
          where: { start: { gte: startOfDay, lte: endOfDay } },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, role: true },
            },
          },
          orderBy: { start: "asc" },
        }),
        calculateMonthlyPayrollSummary(new Date()).catch(() => ({ totalPayroll: 0, totalProjected: 0 })),
        getSpecialDays(new Date()),
        Promise.all([
          (prisma as any).userTask?.count
            ? (prisma as any).userTask.count({ where: { status: "PENDING" } }).catch(() => 0)
            : Promise.resolve(0),
          (prisma as any).staffTask?.count
            ? (prisma as any).staffTask.count({ where: { status: "TODO" } }).catch(() => 0)
            : Promise.resolve(0),
        ]).then(([u, s]) => (u || 0) + (s || 0)),
      ]);

    // Calculate shift status for each checkin (early/late in minutes)
    const checkinsToday = checkinsRaw.map((checkin) => {
      const userShifts = todayShifts.filter((s) => s.userId === checkin.userId);
      let shiftStatus: {
        diffMins: number;
        isLate: boolean;
        isEarly: boolean;
        statusText: string;
      } | null = null;

      if (userShifts.length > 0) {
        let match: any = null;
        let minDiff = Infinity;

        for (const s of userShifts) {
          const target =
            checkin.type === "checkin"
              ? new Date(s.start).getTime()
              : new Date(s.end).getTime();
          const diff = Math.abs(new Date(checkin.timestamp).getTime() - target);
          if (diff < minDiff) {
            minDiff = diff;
            match = s;
          }
        }

        if (match) {
          const targetTime =
            checkin.type === "checkin"
              ? new Date(match.start).getTime()
              : new Date(match.end).getTime();
          const checkinTime = new Date(checkin.timestamp).getTime();
          const diffMins = Math.floor(checkinTime / 60000) - Math.floor(targetTime / 60000);

          // Grace period 1 min
          if (Math.abs(diffMins) > 1) {
            if (checkin.type === "checkin") {
              shiftStatus = {
                diffMins,
                isLate: diffMins > 0,
                isEarly: diffMins < 0,
                statusText: diffMins > 0 ? `Trễ ${diffMins}p` : `Sớm ${Math.abs(diffMins)}p`,
              };
            } else {
              shiftStatus = {
                diffMins,
                isLate: diffMins > 0,
                isEarly: diffMins < 0,
                statusText: diffMins < 0 ? `Sớm ${Math.abs(diffMins)}p` : `Sau ${diffMins}p`,
              };
            }
          }
        }
      }

      return {
        ...checkin,
        shiftStatus,
      };
    });

    const todayCheckinCount = checkinsRaw.filter((ck) => ck.type === "checkin").length;
    const todayCheckoutCount = checkinsRaw.filter((ck) => ck.type === "checkout").length;

    // Calculate onTimeRate & lateRate for checkins today
    const inCheckins = checkinsRaw.filter((ck) => ck.type === "checkin");
    let onTimeCount = 0;
    let lateCount = 0;

    for (const checkin of inCheckins) {
      const userShifts = todayShifts.filter((s) => s.userId === checkin.userId);
      if (userShifts.length > 0) {
        let match: any = null;
        let minDiff = Infinity;

        for (const s of userShifts) {
          const target = new Date(s.start).getTime();
          const diff = Math.abs(new Date(checkin.timestamp).getTime() - target);
          if (diff < minDiff) {
            minDiff = diff;
            match = s;
          }
        }

        if (match) {
          const targetTime = new Date(match.start).getTime();
          const checkinTime = new Date(checkin.timestamp).getTime();
          const diffMins = Math.floor(checkinTime / 60000) - Math.floor(targetTime / 60000);

          if (diffMins > 5) {
            lateCount++;
          } else {
            onTimeCount++;
          }
        } else {
          onTimeCount++;
        }
      } else {
        onTimeCount++;
      }
    }

    const totalEvaluated = onTimeCount + lateCount;
    const onTimeRate = totalEvaluated > 0 ? Math.round((onTimeCount / totalEvaluated) * 1000) / 10 : 100;
    const lateRate = totalEvaluated > 0 ? Math.round((lateCount / totalEvaluated) * 1000) / 10 : 0;
    const estimatedMonthPayroll = payrollSummary?.totalProjected || payrollSummary?.totalPayroll || 0;

    const dataPayload = {
      todayCheckinCount,
      todayCheckoutCount,
      pendingRequestsCount: pendingRequests,
      pendingTasksCount,
      totalEmployeesCount: userCount,
      estimatedMonthPayroll,
      onTimeRate,
      lateRate,
      todayShifts,
      specialUsers,
      checkinsToday,
      userCount,
      ipCount,
      pendingRequests,
      payrollSummary,
    };

    return c.json({
      success: true,
      ...dataPayload,
      data: dataPayload,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load dashboard data" },
      500
    );
  }
});

// GET /api/admin/dashboard-stats
adminRoute.get("/dashboard-stats", async (c) => {
  try {
    const { startOfDay, endOfDay } = getVietnamDayRange();

    const [
      totalEmployeesCount,
      pendingRequestsCount,
      checkinsRaw,
      todayShifts,
      payrollSummary,
      pendingTasksCount,
      specialUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.request.count({ where: { status: "PENDING" } }),
      prisma.checkIn.findMany({
        where: { timestamp: { gte: startOfDay, lte: endOfDay } },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
        orderBy: { timestamp: "asc" },
      }),
      prisma.workShift.findMany({
        where: { start: { gte: startOfDay, lte: endOfDay } },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
        orderBy: { start: "asc" },
      }),
      calculateMonthlyPayrollSummary(new Date()).catch(() => ({ totalPayroll: 0, totalProjected: 0 })),
      Promise.all([
        (prisma as any).userTask?.count
          ? (prisma as any).userTask.count({ where: { status: "PENDING" } }).catch(() => 0)
          : Promise.resolve(0),
        (prisma as any).staffTask?.count
          ? (prisma as any).staffTask.count({ where: { status: "TODO" } }).catch(() => 0)
          : Promise.resolve(0),
      ]).then(([u, s]) => (u || 0) + (s || 0)),
      getSpecialDays(new Date()),
    ]);

    // Calculate shift status for each checkin
    const checkinsToday = checkinsRaw.map((checkin) => {
      const userShifts = todayShifts.filter((s) => s.userId === checkin.userId);
      let shiftStatus: {
        diffMins: number;
        isLate: boolean;
        isEarly: boolean;
        statusText: string;
      } | null = null;

      if (userShifts.length > 0) {
        let match: any = null;
        let minDiff = Infinity;

        for (const s of userShifts) {
          const target =
            checkin.type === "checkin"
              ? new Date(s.start).getTime()
              : new Date(s.end).getTime();
          const diff = Math.abs(new Date(checkin.timestamp).getTime() - target);
          if (diff < minDiff) {
            minDiff = diff;
            match = s;
          }
        }

        if (match) {
          const targetTime =
            checkin.type === "checkin"
              ? new Date(match.start).getTime()
              : new Date(match.end).getTime();
          const checkinTime = new Date(checkin.timestamp).getTime();
          const diffMins = Math.floor(checkinTime / 60000) - Math.floor(targetTime / 60000);

          if (Math.abs(diffMins) > 1) {
            if (checkin.type === "checkin") {
              shiftStatus = {
                diffMins,
                isLate: diffMins > 0,
                isEarly: diffMins < 0,
                statusText: diffMins > 0 ? `Trễ ${diffMins}p` : `Sớm ${Math.abs(diffMins)}p`,
              };
            } else {
              shiftStatus = {
                diffMins,
                isLate: diffMins > 0,
                isEarly: diffMins < 0,
                statusText: diffMins < 0 ? `Sớm ${Math.abs(diffMins)}p` : `Sau ${diffMins}p`,
              };
            }
          }
        }
      }

      return {
        ...checkin,
        shiftStatus,
      };
    });

    const todayCheckinCount = checkinsRaw.filter((ck) => ck.type === "checkin").length;
    const todayCheckoutCount = checkinsRaw.filter((ck) => ck.type === "checkout").length;

    // Calculate onTimeRate & lateRate for checkins today
    const inCheckins = checkinsRaw.filter((ck) => ck.type === "checkin");
    let onTimeCount = 0;
    let lateCount = 0;

    for (const checkin of inCheckins) {
      const userShifts = todayShifts.filter((s) => s.userId === checkin.userId);
      if (userShifts.length > 0) {
        let match: any = null;
        let minDiff = Infinity;

        for (const s of userShifts) {
          const target = new Date(s.start).getTime();
          const diff = Math.abs(new Date(checkin.timestamp).getTime() - target);
          if (diff < minDiff) {
            minDiff = diff;
            match = s;
          }
        }

        if (match) {
          const targetTime = new Date(match.start).getTime();
          const checkinTime = new Date(checkin.timestamp).getTime();
          const diffMins = Math.floor(checkinTime / 60000) - Math.floor(targetTime / 60000);

          if (diffMins > 5) {
            lateCount++;
          } else {
            onTimeCount++;
          }
        } else {
          onTimeCount++;
        }
      } else {
        onTimeCount++;
      }
    }

    const totalEvaluated = onTimeCount + lateCount;
    const onTimeRate = totalEvaluated > 0 ? Math.round((onTimeCount / totalEvaluated) * 1000) / 10 : 100;
    const lateRate = totalEvaluated > 0 ? Math.round((lateCount / totalEvaluated) * 1000) / 10 : 0;
    const estimatedMonthPayroll = payrollSummary?.totalProjected || payrollSummary?.totalPayroll || 0;

    const statsPayload = {
      todayCheckinCount,
      todayCheckoutCount,
      pendingRequestsCount,
      pendingTasksCount,
      totalEmployeesCount,
      estimatedMonthPayroll,
      onTimeRate,
      lateRate,
      todayShifts,
      specialUsers,
      checkinsToday,
    };

    return c.json({
      success: true,
      ...statsPayload,
      data: statsPayload,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load dashboard stats" },
      500
    );
  }
});

// ============================================================================
// DATA EXPORT (XLSX)
// ============================================================================
adminRoute.get("/export", async (c) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_data_${timestamp}.xlsx`;
    const workbook = XLSX.utils.book_new();

    const fromStr = c.req.query("from");
    const toStr = c.req.query("to");

    let dateFilter: any = {};
    if (fromStr || toStr) {
      dateFilter = {};
      if (fromStr) {
        dateFilter.gte = new Date(fromStr + "T00:00:00.000Z");
      }
      if (toStr) {
        dateFilter.lte = new Date(toStr + "T23:59:59.999Z");
      }
    }

    // 1. Users
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    const userRows = users.map((u: any) => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      EmploymentType: u.employmentType,
      HourlyRate: u.hourlyRate,
      Active: u.isActive !== false ? "Đang làm việc" : "Đã nghỉ việc",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(userRows), "Users");

    // 2. CheckIns
    const checkinWhere = Object.keys(dateFilter).length > 0 ? { timestamp: dateFilter } : {};
    const checkins = await prisma.checkIn.findMany({
      where: checkinWhere,
      include: { user: true },
      orderBy: { timestamp: "desc" },
    });
    const checkinRows = checkins.map((ck: any) => ({
      ID: ck.id,
      User: ck.user?.name,
      Email: ck.user?.email,
      Type: ck.type,
      Timestamp: ck.timestamp,
      IP: ck.ipAddress,
      Note: ck.note,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(checkinRows), "CheckIns");

    // 3. Shifts
    const shiftWhere = Object.keys(dateFilter).length > 0 ? { start: dateFilter } : {};
    const shifts = await prisma.workShift.findMany({
      where: shiftWhere,
      include: { user: true },
      orderBy: { start: "desc" },
    });
    const shiftRows = shifts.map((s: any) => ({
      ID: s.id,
      User: s.user?.name,
      Email: s.user?.email,
      Start_Time: s.start,
      End_Time: s.end,
      Duration_Hours: parseFloat(((s.end.getTime() - s.start.getTime()) / 3600000).toFixed(2)),
      Status: s.status,
      Created_At: s.createdAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(shiftRows), "WorkShifts");

    // 4. Requests
    const requestWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const requests = await prisma.request.findMany({
      where: requestWhere,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    const requestRows = requests.map((r: any) => ({
      ID: r.id,
      User: r.user?.name,
      Email: r.user?.email,
      Type: r.type,
      Status: r.status,
      Reason: r.reason,
      CreatedAt: r.createdAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(requestRows), "Requests");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    c.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return c.body(buf);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Export failed" }, 500);
  }
});

// ============================================================================
// 2. USERS MANAGEMENT
// ============================================================================
const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]).default("PART_TIME"),
  hourlyRate: z.number().default(0),
  monthlySalary: z.number().default(6000000),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  birthday: z.string().optional(),
  startDate: z.string().optional(),
  staffTasksAllowed: z.boolean().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  hourlyRate: z.number().optional(),
  monthlySalary: z.number().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]).optional(),
  birthday: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  luckyWheelAllowed: z.boolean().optional(),
  staffTasksAllowed: z.boolean().optional(),
});

// GET /api/admin/users
adminRoute.get("/users", async (c) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        luckyWheelAllowed: true,
        employmentType: true,
        hourlyRate: true,
        monthlySalary: true,
        birthday: true,
        startDate: true,
        staffTasksAllowed: true,
      },
    });

    return c.json({ success: true, data: users });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch users" },
      500
    );
  }
});

// GET /api/admin/employees (alias to /users)
adminRoute.get("/employees", async (c) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        luckyWheelAllowed: true,
        employmentType: true,
        hourlyRate: true,
        monthlySalary: true,
        birthday: true,
        startDate: true,
        staffTasksAllowed: true,
      },
    });

    return c.json({ success: true, data: users });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch employees" },
      500
    );
  }
});

// GET /api/admin/employees/:id
adminRoute.get("/employees/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const now = new Date();
    const month = parseInt(c.req.query("month") || "", 10) || now.getMonth() + 1;
    const year = parseInt(c.req.query("year") || "", 10) || now.getFullYear();
    const targetDate = new Date(year, month - 1, 1);
    const { startDate, endDate } = getVietnamMonthRange(month, year);

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        achievements: true,
        adjustments: {
          where: { date: { gte: startDate, lte: endDate } },
          orderBy: { date: "desc" },
        },
        requests: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return c.json({ success: false, error: "Không tìm thấy nhân viên" }, 404);
    }

    const stats = await calculateUserMonthlyStats(user.id, targetDate);

    return c.json({
      success: true,
      data: {
        user,
        stats,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch employee details" },
      500
    );
  }
});

// PATCH /api/admin/employees/:id/status
adminRoute.patch("/employees/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const isActive = Boolean(body.isActive);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    // If deactivated, delete existing user sessions
    if (!isActive) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    return c.json({
      success: true,
      message: `Đã ${isActive ? "kích hoạt" : "vô hiệu hóa"} nhân viên thành công`,
      data: updatedUser,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to update employee status" },
      500
    );
  }
});

// Common handler for creating user/employee
const handleCreateUser = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parseResult = CreateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parseResult.error.flatten(),
        },
        400
      );
    }

    const {
      name,
      email,
      employmentType,
      hourlyRate,
      monthlySalary,
      role,
      birthday,
      startDate,
      staffTasksAllowed,
    } = parseResult.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return c.json(
        { success: false, error: "Email này đã tồn tại trong hệ thống" },
        400
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        employmentType,
        hourlyRate,
        monthlySalary,
        role,
        birthday: birthday ? new Date(birthday) : null,
        startDate: startDate ? new Date(startDate) : null,
        staffTasksAllowed: staffTasksAllowed !== undefined ? staffTasksAllowed : false,
      },
    });

    return c.json(
      {
        success: true,
        message: "Đã thêm nhân viên mới thành công!",
        data: newUser,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to create user" },
      500
    );
  }
};

// Common handler for updating user/employee
const handleUpdateUser = async (c: any) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const parseResult = UpdateUserSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          error: "Invalid update payload",
          details: parseResult.error.flatten(),
        },
        400
      );
    }

    const data: any = {};
    const {
      name,
      role,
      hourlyRate,
      monthlySalary,
      employmentType,
      birthday,
      startDate,
      isActive,
      luckyWheelAllowed,
      staffTasksAllowed,
    } = parseResult.data;

    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate;
    if (monthlySalary !== undefined) data.monthlySalary = monthlySalary;
    if (employmentType !== undefined) data.employmentType = employmentType;
    if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (isActive !== undefined) data.isActive = isActive;
    if (luckyWheelAllowed !== undefined) data.luckyWheelAllowed = luckyWheelAllowed;
    if (staffTasksAllowed !== undefined) data.staffTasksAllowed = staffTasksAllowed;

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    // If deactivated, delete existing user sessions
    if (isActive === false) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    // If employmentType set to FULL_TIME, auto-generate standard schedule (Mon-Sat 9h-17h VN time) for next 3 months
    if (employmentType === "FULL_TIME") {
      const now = new Date();
      const endLimit = new Date();
      endLimit.setMonth(endLimit.getMonth() + 3);

      const existingShifts = await prisma.workShift.findMany({
        where: {
          userId: id,
          start: { gte: now, lte: endLimit },
        },
        select: { start: true },
      });
      const existingDateKeys = new Set(
        existingShifts.map((s) => s.start.toISOString().split("T")[0])
      );

      const shiftsToCreate = [];
      for (let d = new Date(now); d <= endLimit; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue; // Skip Sunday

        const shiftStart = new Date(d);
        shiftStart.setUTCHours(2, 0, 0, 0); // 09:00 VN time (UTC+7)
        const shiftEnd = new Date(d);
        shiftEnd.setUTCHours(10, 0, 0, 0); // 17:00 VN time (UTC+7)

        const dateKey = shiftStart.toISOString().split("T")[0];
        if (!existingDateKeys.has(dateKey)) {
          shiftsToCreate.push({
            userId: id,
            start: shiftStart,
            end: shiftEnd,
            status: "APPROVED",
          });
        }
      }

      if (shiftsToCreate.length > 0) {
        await prisma.workShift.createMany({ data: shiftsToCreate });
      }
    }

    return c.json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      data: updatedUser,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to update user" },
      500
    );
  }
};

// Common handler for deleting user/employee
const handleDeleteUser = async (c: any) => {
  try {
    const id = c.req.param("id");
    await prisma.user.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa nhân viên thành công" });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to delete user" },
      500
    );
  }
};

// POST /api/admin/users and alias /api/admin/employees
adminRoute.post("/users", handleCreateUser);
adminRoute.post("/employees", handleCreateUser);

// PUT /api/admin/users/:id and alias /api/admin/employees/:id
adminRoute.put("/users/:id", handleUpdateUser);
adminRoute.put("/employees/:id", handleUpdateUser);

// DELETE /api/admin/users/:id and alias /api/admin/employees/:id
adminRoute.delete("/users/:id", handleDeleteUser);
adminRoute.delete("/employees/:id", handleDeleteUser);

// ============================================================================
// 3. ALLOWED IP SETTINGS
// ============================================================================
// GET /api/admin/ip-settings
adminRoute.get("/ip-settings", async (c) => {
  try {
    const ips = await prisma.allowedIP.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, data: ips });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch IP settings" },
      500
    );
  }
});

// POST /api/admin/ip-settings
adminRoute.post("/ip-settings", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    if (!body.prefix) {
      return c.json({ success: false, error: "IP Prefix is required" }, 400);
    }

    const newIp = await prisma.allowedIP.create({
      data: {
        prefix: body.prefix.trim(),
        label: body.label?.trim() || null,
      },
    });

    return c.json(
      { success: true, message: "Đã thêm IP thành công!", data: newIp },
      201
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Lỗi: IP này có thể đã tồn tại" },
      400
    );
  }
});

// DELETE /api/admin/ip-settings/:id
adminRoute.delete("/ip-settings/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid IP id" }, 400);
    }

    await prisma.allowedIP.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa IP thành công" });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to delete IP" },
      500
    );
  }
});

// Aliases for /settings/ips
adminRoute.get("/settings/ips", async (c) => {
  try {
    const ips = await prisma.allowedIP.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(ips);
  } catch (err: any) {
    return c.json([], 500);
  }
});

adminRoute.post("/settings/ips", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    if (!body.prefix) {
      return c.json({ success: false, error: "IP Prefix is required" }, 400);
    }
    const newIp = await prisma.allowedIP.create({
      data: {
        prefix: body.prefix.trim(),
        label: body.label?.trim() || null,
      },
    });
    return c.json({ success: true, message: "Đã thêm IP thành công!", data: newIp }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Lỗi thêm IP" }, 400);
  }
});

adminRoute.delete("/settings/ips/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid IP id" }, 400);
    await prisma.allowedIP.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa IP thành công" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to delete IP" }, 500);
  }
});

// Holiday Settings
adminRoute.get("/settings/holidays", async (c) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return c.json(
      holidays.map((h) => ({
        id: h.id,
        date: h.date.toISOString().split("T")[0],
        name: h.name,
        multiplier: h.multiplier,
      }))
    );
  } catch (err: any) {
    return c.json([], 500);
  }
});

adminRoute.post("/settings/holidays", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { date, name, multiplier } = body;
    if (!date || !name) {
      return c.json({ success: false, error: "date and name are required" }, 400);
    }
    const holiday = await prisma.holiday.upsert({
      where: { date: new Date(date) },
      create: {
        date: new Date(date),
        name: name.trim(),
        multiplier: parseFloat(multiplier) || 3.0,
      },
      update: {
        name: name.trim(),
        multiplier: parseFloat(multiplier) || 3.0,
      },
    });
    return c.json(
      {
        id: holiday.id,
        date: holiday.date.toISOString().split("T")[0],
        name: holiday.name,
        multiplier: holiday.multiplier,
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to save holiday" }, 500);
  }
});

adminRoute.delete("/settings/holidays/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await prisma.holiday.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa ngày lễ" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to delete holiday" }, 500);
  }
});

// ============================================================================
// 4. MANUAL CHECKIN
// ============================================================================
// POST /api/admin/manual-checkin
adminRoute.post("/manual-checkin", async (c) => {
  try {
    const tokenPayload = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const { userId, date, checkInTime, checkOutTime } = body;

    if (!userId || !date) {
      return c.json(
        { success: false, error: "userId and date (YYYY-MM-DD) are required" },
        400
      );
    }

    const adminName = tokenPayload.name || "Admin";
    const note = `Admin ${adminName} chấm công hộ`;

    // Calculate VN day range
    const startOfDay = new Date(`${date}T00:00:00+07:00`);
    const endOfDay = new Date(`${date}T23:59:59.999+07:00`);

    // Clear existing records for this day to allow override
    await prisma.checkIn.deleteMany({
      where: {
        userId,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (checkInTime) {
      const targetDate = new Date(`${date}T${checkInTime}:00+07:00`);
      await prisma.checkIn.create({
        data: {
          userId,
          type: "checkin",
          timestamp: targetDate,
          ipAddress: "Manual",
          note,
        },
      });
    }

    if (checkOutTime) {
      const targetDate = new Date(`${date}T${checkOutTime}:00+07:00`);
      await prisma.checkIn.create({
        data: {
          userId,
          type: "checkout",
          timestamp: targetDate,
          ipAddress: "Manual",
          note,
        },
      });
    }

    return c.json({
      success: true,
      message: "Đã chấm công hộ thành công!",
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to perform manual checkin" },
      500
    );
  }
});

// ============================================================================
// 5. REQUESTS MANAGEMENT
// ============================================================================
// GET /api/admin/requests
adminRoute.get("/requests", async (c) => {
  try {
    const requests = await prisma.request.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ success: true, data: requests });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch admin requests" },
      500
    );
  }
});

// POST /api/admin/requests/:id/action
adminRoute.post("/requests/:id/action", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid request id" }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const action = body.action;

    if (action !== "APPROVED" && action !== "REJECTED") {
      return c.json(
        { success: false, error: "Action must be APPROVED or REJECTED" },
        400
      );
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status: action },
    });

    return c.json({
      success: true,
      message: action === "APPROVED" ? "Đã duyệt đơn thành công" : "Đã từ chối đơn",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to process request action" },
      500
    );
  }
});

// POST /api/admin/requests/:id/approve
adminRoute.post("/requests/:id/approve", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid request id" }, 400);
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return c.json({
      success: true,
      message: "Đã duyệt đơn",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to approve request" },
      500
    );
  }
});

// POST /api/admin/requests/:id/reject
adminRoute.post("/requests/:id/reject", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid request id" }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const updated = await prisma.request.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    return c.json({
      success: true,
      message: "Đã từ chối đơn",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to reject request" },
      500
    );
  }
});

// ============================================================================
// 6. ANNOUNCEMENTS MANAGEMENT
// ============================================================================
// GET /api/admin/announcements
adminRoute.get("/announcements", async (c) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json({ success: true, data: announcements });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to fetch announcements" },
      500
    );
  }
});

// POST /api/admin/announcements
adminRoute.post("/announcements", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    if (!body.title || !body.content) {
      return c.json(
        { success: false, error: "Title and content are required" },
        400
      );
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title: body.title,
        content: body.content,
        type: body.type || "INFO",
        active: true,
      },
    });

    return c.json(
      {
        success: true,
        message: "Đã đăng thông báo thành công!",
        data: newAnnouncement,
      },
      201
    );
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to create announcement" },
      500
    );
  }
});

// DELETE /api/admin/announcements/:id
adminRoute.delete("/announcements/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await prisma.announcement.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa thông báo thành công!" });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to delete announcement" },
      500
    );
  }
});

// PATCH /api/admin/announcements/:id/toggle
adminRoute.patch("/announcements/:id/toggle", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      return c.json({ success: false, error: "Announcement not found" }, 404);
    }
    const nextActive = body.active !== undefined ? Boolean(body.active) : !announcement.active;
    const updated = await prisma.announcement.update({
      where: { id },
      data: { active: nextActive },
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to toggle announcement" }, 500);
  }
});

// Schedule Management for Admin
// GET /api/admin/schedule
adminRoute.get("/schedule", async (c) => {
  try {
    const monthQuery = c.req.query("month");
    const yearQuery = c.req.query("year");
    const startQuery = c.req.query("start");
    const endQuery = c.req.query("end");

    let whereClause: any = {};
    if (startQuery && endQuery) {
      whereClause.start = { gte: new Date(startQuery), lte: new Date(endQuery) };
    } else if (monthQuery || yearQuery) {
      const { startDate, endDate } = getVietnamMonthRange(
        monthQuery ? parseInt(monthQuery, 10) : undefined,
        yearQuery ? parseInt(yearQuery, 10) : undefined
      );
      whereClause.start = { gte: startDate, lte: endDate };
    } else {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      whereClause.start = { gte: startDate };
    }

    const shifts = await prisma.workShift.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
            role: true,
            employmentType: true,
          },
        },
        duties: true,
      },
      orderBy: { start: "asc" },
    });

    const events = shifts.map((s: any) => ({
      id: s.id,
      title: s.user?.name || "Staff",
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      userId: s.userId,
      user: s.user,
      employmentType: s.user?.employmentType || "PART_TIME",
      duties: s.duties || [],
      isSenior: Boolean(s.isSenior),
      isOpenForSwap: Boolean(s.isOpenForSwap),
      shiftType: s.shiftType,
      status: s.status,
    }));

    return c.json({ success: true, data: events });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to fetch schedule" }, 500);
  }
});

// POST /api/admin/schedule
adminRoute.post("/schedule", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { userId, start, end, shiftType, isSenior } = body;
    if (!userId || !start || !end) {
      return c.json({ success: false, error: "Thiếu thông tin ca trực" }, 400);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (durationHours < 4) {
      return c.json({ success: false, error: "Thời gian làm việc tối thiểu 4 tiếng!" }, 400);
    }

    const shift = await prisma.workShift.create({
      data: {
        userId,
        start: startDate,
        end: endDate,
        shiftType: shiftType || "FULL",
        status: "APPROVED",
        isSenior: Boolean(isSenior),
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true, role: true, employmentType: true },
        },
        duties: true,
      },
    });

    const tokenPayload = c.get("user");
    await prisma.shiftAuditLog.create({
      data: {
        shiftId: shift.id,
        userId: shift.userId,
        action: "CREATE",
        changedById: tokenPayload?.id || userId,
        newStart: shift.start,
        newEnd: shift.end,
      },
    }).catch(() => {});

    const event = {
      id: shift.id,
      title: shift.user?.name || "Staff",
      start: shift.start.toISOString(),
      end: shift.end.toISOString(),
      userId: shift.userId,
      user: shift.user,
      employmentType: shift.user?.employmentType || "PART_TIME",
      duties: shift.duties || [],
      isSenior: Boolean(shift.isSenior),
      isOpenForSwap: Boolean(shift.isOpenForSwap),
      shiftType: shift.shiftType,
      status: shift.status,
    };

    return c.json({ success: true, data: event, id: shift.id }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to create shift" }, 500);
  }
});

// PUT /api/admin/schedule/:id
adminRoute.put("/schedule/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid shift id" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const { start, end, isSenior } = body;

    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) return c.json({ success: false, error: "Ca làm không tồn tại" }, 404);

    const updateData: any = {};
    if (start) updateData.start = new Date(start);
    if (end) updateData.end = new Date(end);
    if (isSenior !== undefined) updateData.isSenior = Boolean(isSenior);

    const updated = await prisma.workShift.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true, role: true, employmentType: true },
        },
        duties: true,
      },
    });

    const tokenPayload = c.get("user");
    await prisma.shiftAuditLog.create({
      data: {
        shiftId: id,
        userId: existing.userId,
        action: "UPDATE",
        changedById: tokenPayload?.id || existing.userId,
        oldStart: existing.start,
        oldEnd: existing.end,
        newStart: updated.start,
        newEnd: updated.end,
      },
    }).catch(() => {});

    const event = {
      id: updated.id,
      title: updated.user?.name || "Staff",
      start: updated.start.toISOString(),
      end: updated.end.toISOString(),
      userId: updated.userId,
      user: updated.user,
      employmentType: updated.user?.employmentType || "PART_TIME",
      duties: updated.duties || [],
      isSenior: Boolean(updated.isSenior),
      isOpenForSwap: Boolean(updated.isOpenForSwap),
      shiftType: updated.shiftType,
      status: updated.status,
    };

    return c.json({ success: true, data: event });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update shift" }, 500);
  }
});

// DELETE /api/admin/schedule/:id
adminRoute.delete("/schedule/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid shift id" }, 400);

    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) return c.json({ success: false, error: "Ca làm không tồn tại" }, 404);

    const tokenPayload = c.get("user");
    await prisma.shiftAuditLog.create({
      data: {
        shiftId: id,
        userId: existing.userId,
        action: "DELETE",
        changedById: tokenPayload?.id || existing.userId,
        oldStart: existing.start,
        oldEnd: existing.end,
      },
    }).catch(() => {});

    await prisma.workShift.delete({ where: { id } });
    return c.json({ success: true, message: "Đã xóa ca trực" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to delete shift" }, 500);
  }
});

// PATCH /api/admin/schedule/:id/senior
adminRoute.patch("/schedule/:id/senior", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid shift id" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const isSenior = Boolean(body.isSenior);

    const shift = await prisma.workShift.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!shift) return c.json({ success: false, error: "Ca làm không tồn tại" }, 404);

    const unsetShiftIds: number[] = [];
    const tokenPayload = c.get("user");

    if (isSenior) {
      const overlappingSeniors = await prisma.workShift.findMany({
        where: {
          id: { not: id },
          isSenior: true,
          start: { lt: shift.end },
          end: { gt: shift.start },
        },
      });

      for (const os of overlappingSeniors) {
        unsetShiftIds.push(os.id);
        await prisma.workShift.update({
          where: { id: os.id },
          data: { isSenior: false },
        });
        await prisma.shiftAuditLog.create({
          data: {
            shiftId: os.id,
            userId: os.userId,
            action: "UPDATE",
            changedById: tokenPayload?.id || shift.userId,
            newStart: os.start,
            newEnd: os.end,
          },
        }).catch(() => {});
      }
    }

    const updated = await prisma.workShift.update({
      where: { id },
      data: { isSenior },
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true, role: true, employmentType: true },
        },
        duties: true,
      },
    });

    await prisma.shiftAuditLog.create({
      data: {
        shiftId: shift.id,
        userId: shift.userId,
        action: "UPDATE",
        changedById: tokenPayload?.id || shift.userId,
        newStart: shift.start,
        newEnd: shift.end,
      },
    }).catch(() => {});

    const shiftUserName = shift.user?.name || shift.user?.email || "Nhân viên";
    const message = isSenior
      ? `Đã gán ${shiftUserName} làm Trưởng ca (+3k/h)!`
      : `Đã hủy vai trò Trưởng ca của ${shiftUserName}.`;

    return c.json({ success: true, data: updated, isSenior, message, unsetShiftIds });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update senior status" }, 500);
  }
});

// POST /api/admin/schedule/upload
adminRoute.post("/schedule/upload", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const shiftsParam = body.shifts || body.shiftsParam || (Array.isArray(body) ? body : []);
    const overrideExisting = body.overrideExisting !== false;

    if (!shiftsParam || shiftsParam.length === 0) {
      return c.json({ success: false, error: "Không có dữ liệu lịch làm để tải lên" }, 400);
    }

    const tokenPayload = c.get("user");
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });

    const createdShifts: Array<{ userId: string; start: Date; end: Date; status: string }> = [];
    const unrecognizedNames = new Set<string>();

    const isParsedItemFormat = shiftsParam[0] && "names" in shiftsParam[0];

    if (isParsedItemFormat) {
      const distinctDateStrings = Array.from(new Set(shiftsParam.map((s: any) => s.dateIso))) as string[];

      if (overrideExisting && distinctDateStrings.length > 0) {
        for (const ds of distinctDateStrings) {
          const dtStart = new Date(ds);
          const dtEnd = new Date(dtStart.getTime());
          dtEnd.setDate(dtEnd.getDate() + 1);

          await prisma.workShift.deleteMany({
            where: {
              start: { gte: dtStart, lt: dtEnd },
              OR: [{ shiftType: null }, { shiftType: { not: "FIXED" } }],
            },
          });
        }
      }

      for (const shift of shiftsParam) {
        const shiftDate = new Date(shift.dateIso);
        const start = new Date(shiftDate);
        start.setUTCHours(shift.startHour - 7, 0, 0, 0);

        const end = new Date(shiftDate);
        end.setUTCHours(shift.endHour - 7, 0, 0, 0);

        for (let name of shift.names) {
          name = (name || "").trim();
          if (!name) continue;

          const lowerName = name.toLowerCase();
          let matchedUser = allUsers.find((u) => {
            if (u.name) {
              const un = u.name.toLowerCase();
              return un === lowerName || un.includes(lowerName);
            }
            return false;
          });

          if (!matchedUser) {
            matchedUser = allUsers.find(
              (u) => u.email && u.email.split("@")[0].toLowerCase().includes(lowerName)
            );
          }

          if (matchedUser) {
            createdShifts.push({
              userId: matchedUser.id,
              start,
              end,
              status: "APPROVED",
            });
          } else {
            unrecognizedNames.add(name);
          }
        }
      }
    } else {
      for (const item of shiftsParam) {
        if (item.userId && item.start && item.end) {
          createdShifts.push({
            userId: item.userId,
            start: new Date(item.start),
            end: new Date(item.end),
            status: item.status || "APPROVED",
          });
        }
      }
    }

    if (createdShifts.length > 0) {
      for (const shiftData of createdShifts) {
        const newShift = await prisma.workShift.create({ data: shiftData });
        await prisma.shiftAuditLog.create({
          data: {
            shiftId: newShift.id,
            userId: newShift.userId,
            action: "IMPORT",
            changedById: tokenPayload?.id || newShift.userId,
            newStart: newShift.start,
            newEnd: newShift.end,
          },
        }).catch(() => {});
      }
    }

    let message = `Thành công! Đã lên lịch tự động ${createdShifts.length} ca làm.`;
    if (unrecognizedNames.size > 0) {
      message = `Đã xếp ${createdShifts.length} ca. Không tìm thấy nhân viên: ${Array.from(unrecognizedNames).join(", ")}`;
    }

    return c.json({ success: true, message, count: createdShifts.length });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Lỗi khi tải lịch lên" }, 500);
  }
});

// GET /api/admin/schedule/history
adminRoute.get("/schedule/history", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1", 10);
    const pageSize = parseInt(c.req.query("pageSize") || "50", 10);

    const [logs, total] = await Promise.all([
      prisma.shiftAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          changedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.shiftAuditLog.count(),
    ]);

    return c.json({ success: true, data: logs, logs, total });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to fetch shift history" }, 500);
  }
});

// GET /api/admin/schedule/:id/duties
adminRoute.get("/schedule/:id/duties", async (c) => {
  try {
    const shiftId = parseInt(c.req.param("id"), 10);
    if (isNaN(shiftId)) return c.json({ success: false, error: "Invalid shift id" }, 400);
    const duties = await prisma.shiftDuty.findMany({
      where: { shiftId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    return c.json({ success: true, data: duties });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to fetch duties" }, 500);
  }
});

// POST /api/admin/schedule/duties
adminRoute.post("/schedule/duties", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { title, description, userId, shiftId, date } = body;
    if (!title || !title.trim() || !userId) {
      return c.json({ success: false, error: "Tiêu đề và nhân viên không được để trống" }, 400);
    }
    const tokenPayload = c.get("user");
    const duty = await prisma.shiftDuty.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        userId,
        shiftId: shiftId ? parseInt(shiftId, 10) : null,
        createdById: tokenPayload?.id || userId,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return c.json({ success: true, data: duty }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to create duty" }, 500);
  }
});

// DELETE /api/admin/schedule/duties/:dutyId
adminRoute.delete("/schedule/duties/:dutyId", async (c) => {
  try {
    const dutyId = c.req.param("dutyId");
    await prisma.shiftDuty.delete({ where: { id: dutyId } });
    return c.json({ success: true, message: "Đã xóa nhiệm vụ" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to delete duty" }, 500);
  }
});

// POST /api/admin/schedule/:id/swap
adminRoute.post("/schedule/:id/swap", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid shift id" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) return c.json({ success: false, error: "Ca làm không tồn tại" }, 404);
    const isOpen = body.isOpen !== undefined ? Boolean(body.isOpen) : !existing.isOpenForSwap;
    const updated = await prisma.workShift.update({
      where: { id },
      data: { isOpenForSwap: isOpen },
    });
    return c.json({ success: true, data: updated, isOpenForSwap: isOpen });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to toggle swap" }, 500);
  }
});

// POST /api/admin/schedule/:id/take
adminRoute.post("/schedule/:id/take", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ success: false, error: "Invalid shift id" }, 400);
    const tokenPayload = c.get("user");
    const existing = await prisma.workShift.findUnique({ where: { id } });
    if (!existing) return c.json({ success: false, error: "Ca làm không tồn tại" }, 404);
    const newUserId = tokenPayload?.id || existing.userId;
    const updated = await prisma.workShift.update({
      where: { id },
      data: { userId: newUserId, isOpenForSwap: false },
    });
    await prisma.shiftAuditLog.create({
      data: {
        shiftId: id,
        userId: newUserId,
        action: "TAKE_SWAP",
        changedById: newUserId,
        oldStart: existing.start,
        oldEnd: existing.end,
        newStart: existing.start,
        newEnd: existing.end,
      },
    }).catch(() => {});
    return c.json({ success: true, data: updated, message: "Đã nhận ca thành công!" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to take shift" }, 500);
  }
});

// ============================================================================
// 7. BATCH CLOSE SHIFTS
// ============================================================================
// POST /api/admin/close-all-shifts
adminRoute.post("/close-all-shifts", async (c) => {
  try {
    const { startOfDay, endOfDay } = getVietnamDayRange();
    const checkins = await prisma.checkIn.findMany({
      where: { timestamp: { gte: startOfDay, lte: endOfDay } },
    });

    const userCheckins: Record<string, { hasIn: boolean; hasOut: boolean }> = {};
    for (const ch of checkins) {
      if (!userCheckins[ch.userId]) {
        userCheckins[ch.userId] = { hasIn: false, hasOut: false };
      }
      if (ch.type === "checkin") userCheckins[ch.userId].hasIn = true;
      if (ch.type === "checkout") userCheckins[ch.userId].hasOut = true;
    }

    const usersNeedingCheckout = Object.keys(userCheckins).filter(
      (uid) => userCheckins[uid].hasIn && !userCheckins[uid].hasOut
    );

    const now = new Date();
    for (const userId of usersNeedingCheckout) {
      await prisma.checkIn.create({
        data: {
          userId,
          type: "checkout",
          timestamp: now,
          ipAddress: "Manual",
          note: "Admin đóng ca tự động cuối ngày",
        },
      });
    }

    return c.json({
      success: true,
      message: `Đã đóng ca tự động cho ${usersNeedingCheckout.length} nhân sự`,
      count: usersNeedingCheckout.length,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to close shifts" },
      500
    );
  }
});

// ============================================================================
// 8. PAYROLL ADJUSTMENTS & BONUS CONFIG
// ============================================================================
// POST /api/admin/adjustments
adminRoute.post("/adjustments", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { userId, amount, reason } = body;
    if (!userId || amount === undefined || !reason) {
      return c.json(
        { success: false, error: "userId, amount and reason are required" },
        400
      );
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        userId,
        amount: Math.round(Number(amount)),
        reason: String(reason).trim(),
      },
    });

    return c.json({
      success: true,
      message: "Đã lưu điều chỉnh thành công",
      data: adjustment,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to add adjustment" },
      500
    );
  }
});

// GET /api/admin/payroll
adminRoute.get("/payroll", async (c) => {
  try {
    const month = parseInt(c.req.query("month") || "", 10) || new Date().getMonth() + 1;
    const year = parseInt(c.req.query("year") || "", 10) || new Date().getFullYear();

    const { startDate, endDate } = getVietnamMonthRange(month, year);

    const [users, period] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          hourlyRate: true,
          monthlySalary: true,
          employmentType: true,
          adjustments: {
            where: { date: { gte: startDate, lte: endDate } },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.payrollPeriod.findUnique({
        where: { month_year: { month, year } },
      }),
    ]);

    const targetDate = new Date(year, month - 1, 1);
    const isPeriodClosed = period?.status === "CLOSED";

    const payrollItems = await Promise.all(
      users.map(async (u) => {
        const stats = await calculateUserMonthlyStats(u.id, targetDate).catch(() => null);

        const standardHours = 176;
        const actualHours = stats?.totalHours || 0;
        const overtimeHours = stats ? Math.max(0, actualHours - standardHours) : 0;
        const hourlyRate = stats?.hourlyRate || u.hourlyRate || 0;
        const baseSalary = stats?.baseSalary || 0;
        const bonus = period?.bonusPercent ? Math.round(baseSalary * (period.bonusPercent / 100)) : 0;
        const allowance = 0;
        const penalty = stats?.latePenaltyAmount || 0;
        const totalSalary = stats?.totalSalary || baseSalary + bonus - penalty;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          stats: {
            ...(stats || {}),
            employmentType: u.employmentType,
            baseSalary: stats?.baseSalary || 0,
            totalSalary: stats?.totalSalary || 0,
            hourlyRate: stats?.hourlyRate || u.hourlyRate || 0,
            daysWorked: stats?.daysWorked || 0,
            totalHours: stats?.totalHours || 0,
            finalNet: stats?.totalSalary || 0,
            leaveCount: 0,
            standardDays: 26,
            adjustments: (u.adjustments || []).map((a: any) => ({
              ...a,
              date: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
            })),
          },
          recentAdjustments: (u.adjustments || []).map((a: any) => ({
            id: a.id,
            amount: a.amount,
            reason: a.reason,
            date: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
          })),
          // Flat fields for backwards compatibility:
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          department: u.employmentType === "FULL_TIME" ? "Toàn thời gian" : "Bán thời gian",
          month,
          year,
          standardHours,
          actualHours,
          overtimeHours,
          hourlyRate,
          baseSalary,
          bonus,
          allowance,
          penalty,
          totalSalary,
          isPaid: isPeriodClosed,
        };
      })
    );

    return c.json({
      success: true,
      data: payrollItems,
      isClosed: isPeriodClosed,
      period,
      bonusPercent: period?.bonusPercent || 0,
      bonusTargets: (period?.bonusTargets as string[]) || ["PART_TIME"],
      excludedBonusUsers: (period?.excludedBonusUsers as string[]) || [],
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load payroll" },
      500
    );
  }
});

// GET /api/admin/payroll/:userId
adminRoute.get("/payroll/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const now = new Date();
    const month = parseInt(c.req.query("month") || "", 10) || now.getMonth() + 1;
    const year = parseInt(c.req.query("year") || "", 10) || now.getFullYear();
    const targetDate = new Date(year, month - 1, 1);

    const [user, period, payslip] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.payrollPeriod.findUnique({
        where: { month_year: { month, year } },
      }),
      prisma.payslip.findUnique({
        where: { userId_month_year: { userId, month, year } },
      }),
    ]);

    if (!user) {
      return c.json({ success: false, error: "Không tìm thấy nhân viên" }, 404);
    }

    const isClosed = period?.status === "CLOSED" && !!payslip;
    let stats: any;

    if (isClosed && payslip) {
      stats = payslip.content;
    } else {
      const liveStats = await calculateUserMonthlyStats(userId, targetDate);
      const bonusPercent = period?.bonusPercent || 0;
      const bonusTargets = (period?.bonusTargets as string[]) || ["PART_TIME"];
      const shouldApplyBonus = bonusPercent > 0 && bonusTargets.includes(user.employmentType);
      const bonusAmount =
        shouldApplyBonus && liveStats
          ? Math.round((liveStats.baseSalary || 0) * (bonusPercent / 100))
          : 0;
      const finalNet = (liveStats?.totalSalary || 0) + bonusAmount;

      stats = {
        ...liveStats,
        bonusPercent: shouldApplyBonus ? bonusPercent : 0,
        bonusAmount,
        finalNet,
      };
    }

    return c.json({
      success: true,
      data: {
        user,
        period,
        payslip,
        stats,
        isClosed,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load employee payroll" },
      500
    );
  }
});

// ============================================================================
// TASKS MANAGEMENT
// ============================================================================
// GET /api/admin/tasks
adminRoute.get("/tasks", async (c) => {
  try {
    const tasks = await (prisma as any).userTask.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        taskDefinition: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedTasks = tasks.map((t: any) => ({
      id: t.id,
      userId: t.userId,
      user: {
        id: t.user?.id,
        name: t.user?.name,
        email: t.user?.email,
        image: t.user?.image,
      },
      title: t.taskDefinition?.title || t.note || "Nhiệm vụ được giao",
      type: t.taskDefinition?.type || "PACKAGING",
      quantity: t.quantity,
      ratePerUnit: t.unitPrice,
      totalReward: t.finalAmount || (t.quantity || 1) * (t.unitPrice || 0),
      proofUrl: t.evidenceLink,
      notes: t.note,
      status: t.status,
      submittedAt: t.submittedAt ? t.submittedAt.toISOString() : t.createdAt.toISOString(),
      reviewedAt: t.reviewedAt ? t.reviewedAt.toISOString() : undefined,
    }));

    return c.json({ success: true, data: formattedTasks });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load tasks" },
      500
    );
  }
});

// POST /api/admin/tasks/:id/approve
adminRoute.post("/tasks/:id/approve", async (c) => {
  try {
    const id = c.req.param("id");
    const tokenPayload = c.get("user");
    const adminId = tokenPayload.sub;

    const task = await (prisma as any).userTask.findUnique({ where: { id } });
    if (!task) return c.json({ success: false, error: "Task not found" }, 404);

    const updated = await (prisma as any).userTask.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        finalAmount: (task.quantity || 1) * (task.unitPrice || 0),
      },
    });

    return c.json({ success: true, message: "Đã duyệt nhiệm vụ", data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to approve task" }, 500);
  }
});

// POST /api/admin/tasks/:id/reject
adminRoute.post("/tasks/:id/reject", async (c) => {
  try {
    const id = c.req.param("id");
    const tokenPayload = c.get("user");
    const adminId = tokenPayload.sub;
    const body = await c.req.json().catch(() => ({}));

    const updated = await (prisma as any).userTask.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: adminId,
        adminNote: body.reason || "Từ chối",
      },
    });

    return c.json({ success: true, message: "Đã từ chối nhiệm vụ", data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to reject task" }, 500);
  }
});

// ============================================================================
// LUCKY WHEEL MANAGEMENT
// ============================================================================
// GET /api/admin/lucky-wheel
adminRoute.get("/lucky-wheel", async (c) => {
  try {
    const [prizes, history] = await Promise.all([
      prisma.luckyWheelPrize.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.luckyWheelHistory.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
            },
          },
        },
      }),
    ]);

    return c.json({
      success: true,
      data: {
        prizes,
        history,
      },
      prizes,
      history,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to load lucky wheel data" },
      500
    );
  }
});

// POST /api/admin/lucky-wheel/prizes
adminRoute.post("/lucky-wheel/prizes", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { name, description, value, type, quantity, remaining, probability, active } = body;
    if (!name) return c.json({ success: false, error: "Name is required" }, 400);

    const prize = await prisma.luckyWheelPrize.create({
      data: {
        name,
        description: description || null,
        value: Number(value) || 0,
        type: type || "PHYSICAL",
        quantity: Number(quantity) || 0,
        remaining: remaining !== undefined ? Number(remaining) : Number(quantity) || 0,
        probability: Number(probability) || 0,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    return c.json({ success: true, data: prize }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to create prize" }, 500);
  }
});

// PUT /api/admin/lucky-wheel/prizes/:id
adminRoute.put("/lucky-wheel/prizes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const { name, description, value, type, quantity, remaining, probability, active } = body;
    const updated = await prisma.luckyWheelPrize.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(value !== undefined && { value: Number(value) }),
        ...(type !== undefined && { type }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(remaining !== undefined && { remaining: Number(remaining) }),
        ...(probability !== undefined && { probability: Number(probability) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update prize" }, 500);
  }
});

// DELETE /api/admin/lucky-wheel/prizes/:id
adminRoute.delete("/lucky-wheel/prizes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await prisma.luckyWheelPrize.delete({ where: { id } });
    return c.json({ success: true, message: "Prize deleted" });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to delete prize" }, 500);
  }
});

// POST /api/admin/lucky-wheel/allowed/all
adminRoute.post("/lucky-wheel/allowed/all", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const allowed = body.allowed !== undefined ? Boolean(body.allowed) : true;

    await prisma.user.updateMany({
      data: { luckyWheelAllowed: allowed },
    });

    return c.json({
      success: true,
      message: `Đã ${allowed ? "bật" : "tắt"} quyền quay cho toàn bộ nhân sự!`,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update permissions" }, 500);
  }
});

// PATCH /api/admin/lucky-wheel/allowed/:userId
adminRoute.patch("/lucky-wheel/allowed/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json().catch(() => ({}));
    const allow = body.allow !== undefined ? Boolean(body.allow) : true;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { luckyWheelAllowed: allow },
      select: { id: true, name: true, luckyWheelAllowed: true },
    });

    return c.json({
      success: true,
      message: `Đã ${allow ? "bật" : "tắt"} quyền quay cho nhân sự!`,
      data: updated,
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Failed to update user lucky wheel permission" }, 500);
  }
});

// POST /api/admin/payroll/bonus
adminRoute.post("/payroll/bonus", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { month, year, bonusPercent, targets, excludedBonusUsers } = body;
    if (!month || !year) {
      return c.json({ success: false, error: "month and year are required" }, 400);
    }

    const updated = await prisma.payrollPeriod.upsert({
      where: { month_year: { month, year } },
      create: {
        month,
        year,
        bonusPercent: Number(bonusPercent) || 0,
        bonusTargets: targets || ["PART_TIME"],
        excludedBonusUsers: excludedBonusUsers || [],
      },
      update: {
        bonusPercent: Number(bonusPercent) || 0,
        bonusTargets: targets || ["PART_TIME"],
        excludedBonusUsers: excludedBonusUsers || [],
      },
    });

    return c.json({
      success: true,
      message: "Đã cập nhật cấu hình thưởng tháng",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to update bonus" },
      500
    );
  }
});

// POST /api/admin/payroll/close
adminRoute.post("/payroll/close", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { month, year, bonusPercent, targets, excludedBonusUsers } = body;
    if (!month || !year) {
      return c.json({ success: false, error: "month and year are required" }, 400);
    }

    const updated = await prisma.payrollPeriod.upsert({
      where: { month_year: { month, year } },
      create: {
        month,
        year,
        status: "CLOSED",
        bonusPercent: Number(bonusPercent) || 0,
        bonusTargets: targets || ["PART_TIME"],
        excludedBonusUsers: excludedBonusUsers || [],
      },
      update: {
        status: "CLOSED",
        bonusPercent: Number(bonusPercent) || 0,
        bonusTargets: targets || ["PART_TIME"],
        excludedBonusUsers: excludedBonusUsers || [],
      },
    });

    return c.json({
      success: true,
      message: "Đã chốt sổ bảng lương tháng thành công!",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to close payroll" },
      500
    );
  }
});

// POST /api/admin/payroll/reopen
adminRoute.post("/payroll/reopen", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { month, year } = body;
    if (!month || !year) {
      return c.json({ success: false, error: "month and year are required" }, 400);
    }

    const updated = await prisma.payrollPeriod.update({
      where: { month_year: { month, year } },
      data: { status: "OPEN" },
    });

    return c.json({
      success: true,
      message: "Đã mở lại sổ tính lương!",
      data: updated,
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to reopen payroll" },
      500
    );
  }
});

// ============================================================================
// 9. REPORTS
// ============================================================================
// GET /api/admin/reports
adminRoute.get("/reports", async (c) => {
  try {
    const month =
      parseInt(c.req.query("month") || "", 10) || new Date().getMonth() + 1;
    const year =
      parseInt(c.req.query("year") || "", 10) || new Date().getFullYear();
    const { startDate, endDate } = getVietnamMonthRange(month, year);

    const [users, checkins, pointTasks, carryingTasks] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true, image: true },
      }),
      prisma.checkIn.findMany({
        where: { timestamp: { gte: startDate, lte: endDate } },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
      prisma.userTask.findMany({
        where: {
          status: "APPROVED",
          submittedAt: { gte: startDate, lte: endDate },
          taskDefinition: { unit: "điểm" },
        },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
      prisma.userTask.findMany({
        where: {
          status: "APPROVED",
          submittedAt: { gte: startDate, lte: endDate },
          taskDefinition: { unit: "điểm-bưng" },
        },
        include: {
          user: { select: { id: true, name: true, role: true, image: true } },
        },
      }),
    ]);

    const userLateStats: Record<
      string,
      { user: any; lateCount: number; totalLateMinutes: number }
    > = {};
    for (const ch of checkins) {
      if (ch.note?.includes("Trễ") || ch.note?.includes("Đi muộn")) {
        if (!userLateStats[ch.userId]) {
          userLateStats[ch.userId] = {
            user: ch.user,
            lateCount: 0,
            totalLateMinutes: 0,
          };
        }
        userLateStats[ch.userId].lateCount += 1;
        const match = ch.note.match(/(\d+)p/);
        if (match)
          userLateStats[ch.userId].totalLateMinutes += parseInt(match[1], 10);
      }
    }

    const topLate = Object.values(userLateStats).sort(
      (a, b) => b.lateCount - a.lateCount
    );

    const payrollSummary = await calculateMonthlyPayrollSummary(new Date(year, month - 1, 1)).catch(() => ({
      totalPayroll: 0,
      totalProjected: 0,
      details: [],
    }));
    const totalPayrollCost = payrollSummary?.totalPayroll || 0;
    const totalHoursAll = Array.isArray(payrollSummary?.details)
      ? payrollSummary.details.reduce((acc: number, d: any) => acc + (d.actualHours || 0), 0)
      : 0;

    const topHardworking =
      Array.isArray(payrollSummary?.details) && payrollSummary.details.length > 0
        ? payrollSummary.details
            .slice()
            .sort((a: any, b: any) => (b.actualHours || 0) - (a.actualHours || 0))
            .slice(0, 5)
            .map((d: any) => ({
              id: d.userId,
              name: d.userName,
              totalHours: d.actualHours || 0,
              daysWorked: Math.round((d.actualHours || 0) / 8),
            }))
        : [];

    const topDiscipline =
      users.length > 0
        ? users.slice(0, 5).map((u) => ({
            user: u,
            totalScheduledCheckins: 0,
            punctualityRate: 100,
          }))
        : [];

    const topOvertime =
      Array.isArray(payrollSummary?.details) && payrollSummary.details.length > 0
        ? payrollSummary.details
            .filter((d: any) => (d.overtimeHours || 0) > 0)
            .sort((a: any, b: any) => (b.overtimeHours || 0) - (a.overtimeHours || 0))
            .slice(0, 5)
            .map((d: any) => ({
              id: d.userId,
              name: d.userName,
              avgOvertime: Math.round(((d.overtimeHours || 0) / 20) * 10) / 10,
              displayOvertimeHours: d.overtimeHours || 0,
              daysWorked: Math.round((d.actualHours || 0) / 8),
            }))
        : [];

    // Top Packing
    const userPointsMap: Record<string, { id: string; name: string; image: string | null; points: number }> = {};
    for (const pt of pointTasks) {
      if (!userPointsMap[pt.userId]) {
        userPointsMap[pt.userId] = { id: pt.user.id, name: pt.user.name || "Nhân viên", image: pt.user.image, points: 0 };
      }
      userPointsMap[pt.userId].points += (pt.finalAmount || pt.quantity || 0);
    }
    const topPacking = Object.values(userPointsMap).sort((a, b) => b.points - a.points).slice(0, 5);

    // Top Carrying
    const userCarryingMap: Record<string, { id: string; name: string; image: string | null; points: number }> = {};
    for (const ct of carryingTasks) {
      if (!userCarryingMap[ct.userId]) {
        userCarryingMap[ct.userId] = { id: ct.user.id, name: ct.user.name || "Nhân viên", image: ct.user.image, points: 0 };
      }
      userCarryingMap[ct.userId].points += (ct.finalAmount || ct.quantity || 0);
    }
    const topCarrying = Object.values(userCarryingMap).sort((a, b) => b.points - a.points).slice(0, 5);

    return c.json({
      success: true,
      data: {
        totalPayrollCost,
        totalHoursAll,
        totalEmployeeCount: users.length,
        topHardworking,
        topDiscipline,
        topOvertime,
        topPacking,
        topCarrying,
        topLate,
      },
    });
  } catch (err: any) {
    return c.json(
      { success: false, error: err?.message || "Failed to generate report" },
      500
    );
  }
});

