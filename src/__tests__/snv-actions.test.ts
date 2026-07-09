import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn().mockImplementation((fn) => fn(mockPrisma)),
  sNVScenario: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  sNVVictim: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import {
  importSNVScenarioAction,
  getPublicScenariosAction,
  getPublicScenarioByIdAction,
} from "@/app/actions/snv-actions";

describe("importSNVScenarioAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession = (user: { id: string } | null) => {
    if (user) {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: {
          ...user,
          email: "user@example.com",
          emailVerified: true,
          name: "User",
          roles: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: "session-1",
          userId: user.id,
          token: "token",
          expiresAt: new Date(),
          userAgent: "agent",
          ipAddress: "127.0.0.1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);
    }
  };

  it("should return Unauthorized if session is missing", async () => {
    mockSession(null);

    const result = await importSNVScenarioAction({});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("should return error if payload validation fails", async () => {
    mockSession({ id: "user-1" });

    const result = await importSNVScenarioAction({
      title: "",
      level: "",
      description: "",
      victimes: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Structure JSON invalide");
  });

  it("should successfully import scenario and victims in a transaction", async () => {
    mockSession({ id: "user-1" });

    mockPrisma.sNVScenario.create.mockResolvedValue({ id: 42 });
    mockPrisma.sNVVictim.create.mockResolvedValue({ id: 100 });

    const payload = {
      title: "Accident bus",
      level: "PSE 1",
      description: "Sortie de route d'un bus",
      victimes: [
        {
          description: "Victime consciente respirant bien",
          correctAnswer: 1,
          explanation: "Tri jaune, blessé stable sans urgence absolue",
        },
      ],
    };

    const result = await importSNVScenarioAction(payload);

    expect(result.success).toBe(true);
    expect(mockPrisma.sNVScenario.create).toHaveBeenCalledWith({
      data: {
        title: "Accident bus",
        level: "PSE 1",
        description: "Sortie de route d'un bus",
      },
    });
    expect(mockPrisma.sNVVictim.create).toHaveBeenCalledWith({
      data: {
        description: "Victime consciente respirant bien",
        correctAnswer: 1,
        explanation: "Tri jaune, blessé stable sans urgence absolue",
        scenarioId: 42,
      },
    });
  });

  describe("getPublicScenariosAction", () => {
    it("should successfully fetch scenarios and victims without auth session", async () => {
      mockPrisma.sNVScenario.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Accident",
          level: "PSE1",
          description: "Details",
          victimes: [{ id: 10, description: "V1" }],
        },
      ]);
      mockPrisma.sNVScenario.count.mockResolvedValue(1);

      const res = await getPublicScenariosAction(1, 10);
      expect(res.success).toBe(true);
      expect(res.data!).toHaveLength(1);
      expect(res.data![0].title).toBe("Accident");
    });
  });

  describe("getPublicScenarioByIdAction", () => {
    it("should return scenario if found", async () => {
      mockPrisma.sNVScenario.findUnique.mockResolvedValue({
        id: 1,
        title: "Accident",
        level: "PSE1",
        description: "Details",
        victimes: [{ id: 10, description: "V1" }],
      });

      const res = await getPublicScenarioByIdAction(1);
      expect(res.success).toBe(true);
      expect(res.data!.title).toBe("Accident");
    });

    it("should return error if not found", async () => {
      mockPrisma.sNVScenario.findUnique.mockResolvedValue(null);

      const res = await getPublicScenarioByIdAction(99);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Scénario introuvable.");
    });
  });
});
