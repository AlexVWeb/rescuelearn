import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUsersAction,
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "./user-actions";
import { getUserContext } from "@/lib/context";
import { UserRole } from "@/lib/roles";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  account: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("User Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUsersAction", () => {
    it("should return Forbidden if caller is not SUPER_ADMIN", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "User",
        email: "user@example.com",
        roles: [UserRole.PLAYER],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      const result = await getUsersAction();
      expect(result).toEqual({ success: false, error: "Forbidden" });
    });

    it("should fetch users with search, role, status, sorting, and pagination", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "SuperAdmin",
        email: "admin@example.com",
        roles: [UserRole.SUPER_ADMIN],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      mockPrisma.user.findMany.mockResolvedValueOnce([
        {
          id: "u1",
          name: "Alice",
          email: "alice@example.com",
          image: null,
          roles: JSON.stringify([UserRole.FORMATEUR]),
          createdAt: new Date(),
          emailVerified: true,
        },
      ]);
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const result = await getUsersAction(
        2,
        5,
        "alice",
        UserRole.FORMATEUR,
        "verified",
        "name",
        "desc"
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe("Alice");
      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
          ],
          roles: {
            array_contains: UserRole.FORMATEUR,
          },
          emailVerified: true,
        },
        skip: 5,
        take: 5,
        orderBy: { name: "desc" },
      });
    });

    it("should handle failures gracefullly", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "SuperAdmin",
        email: "admin@example.com",
        roles: [UserRole.SUPER_ADMIN],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      mockPrisma.user.findMany.mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await getUsersAction();
      expect(result).toEqual({
        success: false,
        error: "Failed to fetch users",
      });
    });
  });

  describe("createUserAction", () => {
    it("should return Forbidden if caller is not SUPER_ADMIN", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "User",
        email: "user@example.com",
        roles: [UserRole.PLAYER],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      const result = await createUserAction({
        name: "Bob",
        email: "bob@example.com",
        role: "PLAYER",
        password: "password123",
      });
      expect(result).toEqual({ success: false, error: "Forbidden" });
    });
  });

  describe("deleteUserAction", () => {
    it("should return Forbidden if caller is not SUPER_ADMIN", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "User",
        email: "user@example.com",
        roles: [UserRole.PLAYER],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      const result = await deleteUserAction("u1");
      expect(result).toEqual({ success: false, error: "Forbidden" });
    });
  });

  describe("updateUserAction", () => {
    it("should return Forbidden if caller is not SUPER_ADMIN", async () => {
      vi.mocked(getUserContext).mockResolvedValueOnce({
        id: "1",
        name: "User",
        email: "user@example.com",
        roles: [UserRole.PLAYER],
        organismeId: null,
        firstName: null,
        lastName: null,
      });

      const result = await updateUserAction("u1", { name: "Bob" });
      expect(result).toEqual({ success: false, error: "Forbidden" });
    });
  });
});
