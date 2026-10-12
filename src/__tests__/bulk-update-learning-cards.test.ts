import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  learningCard: {
    updateMany: vi.fn((args: unknown) => args),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getUserContext } from "@/lib/context";
import { bulkUpdateLearningCardsAction } from "@/app/actions/learning-card-actions";

describe("bulkUpdateLearningCardsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      roles: [UserRole.SUPER_ADMIN],
    } as never);
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) =>
      ops.map(() => ({ count: 2 }))
    );
  });

  it("refuse un utilisateur non super admin", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      roles: [],
    } as never);
    const res = await bulkUpdateLearningCardsAction({
      ids: [1],
      niveau: "PSE1",
    });
    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuse une requête sans champ à modifier", async () => {
    const res = await bulkUpdateLearningCardsAction({ ids: [1, 2] });
    expect(res.success).toBe(false);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("ne modifie que les champs fournis", async () => {
    const res = await bulkUpdateLearningCardsAction({
      ids: [1, 2],
      niveau: " PSE2 ",
    });
    expect(res).toEqual({ success: true, count: 2 });
    expect(mockPrisma.learningCard.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.learningCard.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { niveau: "PSE2" },
    });
  });

  it("assigne le référentiel et détache les sujets d'un autre référentiel", async () => {
    await bulkUpdateLearningCardsAction({ ids: [1, 2], referencielId: 6 });
    expect(mockPrisma.learningCard.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: [1, 2] } },
      data: { referencielId: 6 },
    });
    expect(mockPrisma.learningCard.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: [1, 2] },
        topicId: { not: null },
        topic: { referencielId: { not: 6 } },
      },
      data: { topicId: null },
    });
  });

  it("retirer le référentiel détache tous les sujets", async () => {
    await bulkUpdateLearningCardsAction({ ids: [3], referencielId: null });
    expect(mockPrisma.learningCard.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [3] }, topicId: { not: null } },
      data: { topicId: null },
    });
  });
});
