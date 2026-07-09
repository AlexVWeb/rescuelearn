import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock R2 deleteFile
vi.mock("@/lib/r2", () => ({
  deleteFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock pg pool and PrismaClient hoisted
const { mockFindUnique, mockFindMany, mockDelete, mockDeleteMany } = vi.hoisted(
  () => ({
    mockFindUnique: vi.fn(),
    mockFindMany: vi.fn(),
    mockDelete: vi.fn(),
    mockDeleteMany: vi.fn(),
  })
);

vi.mock("@prisma/client", () => {
  class MockPrismaClient {
    $extends(extension: {
      query?: {
        referenciel?: {
          delete?: (params: {
            args: { where: { id: number } };
            query: typeof mockDelete;
          }) => Promise<{ id: number }>;
          deleteMany?: (params: {
            args: { where: { id: { in: number[] } } };
            query: typeof mockDeleteMany;
          }) => Promise<{ count: number }>;
        };
      };
    }) {
      return {
        referenciel: {
          delete: async (args: { where: { id: number } }) => {
            if (extension.query?.referenciel?.delete) {
              return extension.query.referenciel.delete({
                args,
                query: mockDelete,
              });
            }
            return mockDelete(args);
          },
          deleteMany: async (args: { where: { id: { in: number[] } } }) => {
            if (extension.query?.referenciel?.deleteMany) {
              return extension.query.referenciel.deleteMany({
                args,
                query: mockDeleteMany,
              });
            }
            return mockDeleteMany(args);
          },
        },
      };
    }
    referenciel = {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
    };
  }
  return {
    PrismaClient: MockPrismaClient,
    Prisma: {
      defineExtension: <T>(ext: T) => ext,
    },
  };
});

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

vi.mock("pg", () => ({
  Pool: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/r2";

describe("Prisma Extensions - Referenciel delete hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_PUBLIC_URL = "https://r2.example.com";
  });

  describe("delete", () => {
    it("should call deleteFile when a referenciel with pdfUrl is deleted", async () => {
      mockFindUnique.mockResolvedValue({
        id: 1,
        pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf",
      });
      mockDelete.mockResolvedValue({ id: 1 });

      const result = await prisma.referenciel.delete({
        where: { id: 1 },
      });

      expect(result).toEqual({ id: 1 });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { pdfUrl: true },
      });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(deleteFile).toHaveBeenCalledWith("dev/referenciels/pse1.pdf");
    });

    it("should not call deleteFile if referenciel has no pdfUrl or not R2 URL", async () => {
      mockFindUnique.mockResolvedValue({
        id: 2,
        pdfUrl: "https://other-domain.com/pse1.pdf",
      });
      mockDelete.mockResolvedValue({ id: 2 });

      await prisma.referenciel.delete({
        where: { id: 2 },
      });

      expect(deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("deleteMany", () => {
    it("should call deleteFile for all matching referenciels with R2 urls", async () => {
      mockFindMany.mockResolvedValue([
        { pdfUrl: "https://r2.example.com/dev/referenciels/pse1.pdf" },
        { pdfUrl: "https://other-domain.com/pse1.pdf" },
        { pdfUrl: "https://r2.example.com/dev/referenciels/pse2.pdf" },
      ]);
      mockDeleteMany.mockResolvedValue({ count: 3 });

      const result = await prisma.referenciel.deleteMany({
        where: { id: { in: [1, 2, 3] } },
      });

      expect(result).toEqual({ count: 3 });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
        select: { pdfUrl: true },
      });
      expect(deleteFile).toHaveBeenCalledTimes(2);
      expect(deleteFile).toHaveBeenCalledWith("dev/referenciels/pse1.pdf");
      expect(deleteFile).toHaveBeenCalledWith("dev/referenciels/pse2.pdf");
    });
  });
});
