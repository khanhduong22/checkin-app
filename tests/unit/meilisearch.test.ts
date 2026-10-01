import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    staffTask: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockTaskFindMany = prisma.staffTask.findMany as ReturnType<typeof vi.fn>;

describe("Meilisearch Search Module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("gracefully falls back to Prisma when Meilisearch throws an error (zero-crash invariant)", async () => {
    const mockUsers = [
      { id: "u-1", name: "Nguyễn Văn A", email: "a@limart.com", role: "USER", isActive: true },
    ];
    mockUserFindMany.mockResolvedValue(mockUsers);

    vi.doMock("meilisearch", () => ({
      Meilisearch: class MockMeili {
        index() {
          return {
            search: vi.fn().mockRejectedValue(new Error("Meilisearch connection refused")),
          };
        }
      },
    }));

    const { searchUsers, resetMeiliClient } = await import("@/lib/meilisearch");
    resetMeiliClient();

    const results = await searchUsers("nguyen");

    expect(results).toEqual(mockUsers);
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { name: { contains: "nguyen", mode: "insensitive" } },
                { email: { contains: "nguyen", mode: "insensitive" } },
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("returns Meilisearch hits when Meilisearch search succeeds", async () => {
    const meiliHits = [
      { id: "u-2", name: "Trần Thị B", email: "b@limart.com", role: "USER", isActive: true },
    ];

    vi.doMock("meilisearch", () => ({
      Meilisearch: class MockMeili {
        index() {
          return {
            search: vi.fn().mockResolvedValue({ hits: meiliHits }),
          };
        }
      },
    }));

    const { searchUsers, resetMeiliClient } = await import("@/lib/meilisearch");
    resetMeiliClient();

    const results = await searchUsers("tran");

    expect(results).toEqual(meiliHits);
    expect(mockUserFindMany).not.toHaveBeenCalled();
  });

  it("falls back to Prisma task query when Meilisearch fails for tasks", async () => {
    const mockTasks = [
      { id: "t-1", title: "Kiểm kho tuần 14", status: "TODO", assigneeId: "u-1" },
    ];
    mockTaskFindMany.mockResolvedValue(mockTasks);

    vi.doMock("meilisearch", () => ({
      Meilisearch: class MockMeili {
        index() {
          return {
            search: vi.fn().mockRejectedValue(new Error("Timeout")),
          };
        }
      },
    }));

    const { searchTasks, resetMeiliClient } = await import("@/lib/meilisearch");
    resetMeiliClient();

    const results = await searchTasks("kiem kho");

    expect(results).toEqual(mockTasks);
    expect(mockTaskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { title: { contains: "kiem kho", mode: "insensitive" } },
              ]),
            }),
          ]),
        }),
      })
    );
  });
});
