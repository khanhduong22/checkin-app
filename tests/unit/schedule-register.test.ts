import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerShift } from "../../src/app/actions/schedule";
import { prisma } from "../../src/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workShift: {
      count: vi.fn(),
      findMany: vi.fn(),
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

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockShiftCount = prisma.workShift.count as ReturnType<typeof vi.fn>;
const mockShiftFindMany = prisma.workShift.findMany as ReturnType<typeof vi.fn>;
const mockShiftCreate = prisma.workShift.create as ReturnType<typeof vi.fn>;

describe("registerShift Limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock "now" to Tuesday, June 23, 2026 VN (07:00 UTC)
    // So next week shifts (week starting June 29) are NOT locked.
    const mockNow = new Date("2026-06-23T07:00:00Z");
    vi.setSystemTime(mockNow);
    
    // Default mock user session
    mockGetServerSession.mockResolvedValue({
      user: { email: "staff@example.com" },
    });

    // Default mock requester user
    mockUserFindUnique.mockResolvedValue({
      id: "user-staff",
      email: "staff@example.com",
      role: "STAFF",
      employmentType: "PART_TIME",
    });

    // Default mock overlap check to 0 (no self overlap)
    mockShiftCount.mockResolvedValue(0);

    // Default mock shift creation
    mockShiftCreate.mockResolvedValue({
      id: 123,
      userId: "user-staff",
      start: new Date(),
      end: new Date(),
      status: "APPROVED",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks registration next week if there are already 3 concurrent part-time shifts", async () => {
    // Next week shift: July 1, 2026 (Wednesday), 08:00 - 12:00 VN (01:00 - 05:00 UTC)
    const start = new Date("2026-07-01T01:00:00Z");
    const end = new Date("2026-07-01T05:00:00Z");

    // Mock 3 existing overlapping part-time shifts
    const mockOverlapping = [
      { id: 1, userId: "user-1", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
      { id: 2, userId: "user-2", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
      { id: 3, userId: "user-3", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
    ];
    mockShiftFindMany.mockResolvedValue(mockOverlapping);

    const result = await registerShift(start, end, false);

    expect(result.success).toBe(false);
    expect(result.error).toBe("LIMIT_PART_TIME");
    expect(result.count).toBe(3);
    expect(mockShiftCreate).not.toHaveBeenCalled();
  });

  it("allows registration next week if there are only 2 concurrent part-time shifts", async () => {
    const start = new Date("2026-07-01T01:00:00Z");
    const end = new Date("2026-07-01T05:00:00Z");

    // Mock 2 existing overlapping part-time shifts
    const mockOverlapping = [
      { id: 1, userId: "user-1", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
      { id: 2, userId: "user-2", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
    ];
    mockShiftFindMany.mockResolvedValue(mockOverlapping);

    const result = await registerShift(start, end, false);

    expect(result.success).toBe(true);
    expect(mockShiftCreate).toHaveBeenCalledOnce();
  });

  it("allows registration next week even with 3 shifts if override is true", async () => {
    const start = new Date("2026-07-01T01:00:00Z");
    const end = new Date("2026-07-01T05:00:00Z");

    // Mock 3 existing overlapping part-time shifts
    const mockOverlapping = [
      { id: 1, userId: "user-1", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
      { id: 2, userId: "user-2", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
      { id: 3, userId: "user-3", start: new Date("2026-07-01T01:00:00Z"), end: new Date("2026-07-01T05:00:00Z") },
    ];
    mockShiftFindMany.mockResolvedValue(mockOverlapping);

    const result = await registerShift(start, end, true);

    expect(result.success).toBe(true);
    expect(mockShiftCreate).toHaveBeenCalledOnce();
  });

  it("allows registration for the current week even if there are already 3 concurrent shifts", async () => {
    // Current week shift: June 25, 2026 (Thursday), 08:00 - 12:00 VN
    const start = new Date("2026-06-25T01:00:00Z");
    const end = new Date("2026-06-25T05:00:00Z");

    // Mock 3 existing overlapping part-time shifts
    const mockOverlapping = [
      { id: 1, userId: "user-1", start: new Date("2026-06-25T01:00:00Z"), end: new Date("2026-06-25T05:00:00Z") },
      { id: 2, userId: "user-2", start: new Date("2026-06-25T01:00:00Z"), end: new Date("2026-06-25T05:00:00Z") },
      { id: 3, userId: "user-3", start: new Date("2026-06-25T01:00:00Z"), end: new Date("2026-06-25T05:00:00Z") },
    ];
    mockShiftFindMany.mockResolvedValue(mockOverlapping);

    // Mock role as ADMIN to bypass locking check for current week shift
    mockUserFindUnique.mockResolvedValue({
      id: "user-staff",
      email: "staff@example.com",
      role: "ADMIN",
      employmentType: "PART_TIME",
    });

    const result = await registerShift(start, end, false);

    expect(result.success).toBe(true);
    expect(mockShiftCreate).toHaveBeenCalledOnce();
  });
});
