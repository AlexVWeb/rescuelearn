import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/lib/roles";

// --- Mocks ---
vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  progressionTree: {
    upsert: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  progressionNode: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  progressionNodeExercise: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  playerProgress: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  referenciel: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((arg) => Promise.all(arg)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getUserContext } from "@/lib/context";
import {
  getProgressionTreesAction,
  createProgressionNodeAction,
} from "@/app/actions/progression-admin-actions";
import {
  getPlayerProgressionPathAction,
  submitNodeCompletionAction,
} from "@/app/actions/progression-player-actions";

describe("progression server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = (
    roles: string[],
    onboardingExperience: string = "beginner"
  ) => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      name: "Player One",
      roles,
      organismeId: null,
      firstName: "Player",
      lastName: "One",
      onboardingExperience,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>);
  };

  describe("Admin Actions", () => {
    it("should reject getProgressionTreesAction if user is not SUPER_ADMIN", async () => {
      mockUser([UserRole.PLAYER]);
      const res = await getProgressionTreesAction();
      expect(res.success).toBe(false);
      expect(res.error).toBe("Action non autorisée.");
    });

    it("should successfully fetch trees if user is SUPER_ADMIN", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.progressionTree.findMany.mockResolvedValue([
        { id: "tree-1", level: "GQS", nodes: [] },
      ]);

      const res = await getProgressionTreesAction();
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("should successfully create a new node and append it at the end", async () => {
      mockUser([UserRole.SUPER_ADMIN]);
      mockPrisma.progressionNode.count.mockResolvedValue(2);
      mockPrisma.progressionNode.create.mockResolvedValue({
        id: "node-3",
        title: "Massage Cardiaque",
        order: 2,
      });

      const res = await createProgressionNodeAction({
        treeId: "tree-1",
        title: "Massage Cardiaque",
        xpReward: 120,
      });

      expect(res.success).toBe(true);
      expect(mockPrisma.progressionNode.create).toHaveBeenCalledWith({
        data: {
          treeId: "tree-1",
          title: "Massage Cardiaque",
          description: undefined,
          xpReward: 120,
          order: 2,
        },
      });
    });
  });

  describe("Player Actions", () => {
    it("should load the correct progression tree based on onboarding experience", async () => {
      mockUser([UserRole.PLAYER], "intermediate"); // maps to PSC
      mockPrisma.progressionTree.findUnique.mockResolvedValue({
        id: "tree-psc",
        level: "PSC",
        nodes: [
          { id: "node-1", title: "Hémorragies", xpReward: 100 },
          { id: "node-2", title: "Garrot", xpReward: 100 },
        ],
      });
      mockPrisma.playerProgress.findMany.mockResolvedValue([
        { nodeId: "node-1" },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        xp: 150,
        hearts: 5,
        streak: 3,
      });

      const res = await getPlayerProgressionPathAction();
      expect(res.success).toBe(true);
      expect(res.data?.level).toBe("PSC");
      expect(res.data?.nodes[0].status).toBe("completed");
      expect(res.data?.nodes[1].status).toBe("current");
    });

    it("should successfully complete a node, reward XP, and calculate streak", async () => {
      mockUser([UserRole.PLAYER]);
      mockPrisma.progressionNode.findUnique.mockResolvedValue({
        id: "node-1",
        title: "Hémorragies",
        xpReward: 100,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        xp: 150,
        streak: 2,
        lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // active yesterday
      });
      mockPrisma.user.update.mockResolvedValue({
        xp: 250,
        streak: 3,
      });

      const res = await submitNodeCompletionAction("node-1", 100);
      expect(res.success).toBe(true);
      expect(res.data?.xpGained).toBe(100);
      expect(res.data?.streak).toBe(3); // streak incremented
    });
  });
});
