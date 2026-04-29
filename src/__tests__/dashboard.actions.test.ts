import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "dayjs";

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
  user: { findUnique: vi.fn() },
  trainingSession: { findMany: vi.fn() },
  emargement: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// --- Helpers ---

import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/app/admin/training/actions/dashboard";
import {
  SESSION_STATUS,
  INSCRIPTION_STATUS,
  ATTESTATION_RESULT,
  EMARGEMENT_STATUS,
} from "@/app/admin/training/types";

function mockAuthenticatedUser(organismeId = "org-1") {
  (
    auth.api.getSession as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue({
    user: { id: "user-1" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organismeId,
  });
}

describe("getDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcule correctement les statistiques de base", async () => {
    mockAuthenticatedUser("org-1");

    const now = dayjs();
    const monthStart = now.startOf("month").toDate();

    // Mock upcoming sessions
    mockPrisma.trainingSession.findMany.mockImplementation(({ where }) => {
      if (where.status === SESSION_STATUS.TERMINEE) {
        return Promise.resolve([
          {
            id: "session-done-1",
            status: SESSION_STATUS.TERMINEE,
            endDate: now.toDate(),
            inscriptions: [
              {
                status: INSCRIPTION_STATUS.PRESENT,
                attestationResult: ATTESTATION_RESULT.ACQUIS,
              },
              {
                status: INSCRIPTION_STATUS.PRESENT,
                attestationResult: ATTESTATION_RESULT.NON_ACQUIS,
              },
              { status: INSCRIPTION_STATUS.ABSENT, attestationResult: null },
            ],
          },
        ]);
      }
      return Promise.resolve([
        { id: "session-up-1", startDate: monthStart },
        { id: "session-up-2", startDate: now.subtract(2, "month").toDate() },
      ]);
    });

    // Mock emargements for presence rate
    mockPrisma.emargement.findMany.mockResolvedValue([
      { status: EMARGEMENT_STATUS.VALIDE },
      { status: EMARGEMENT_STATUS.VALIDE },
      { status: EMARGEMENT_STATUS.ABSENT },
      { status: EMARGEMENT_STATUS.EN_ATTENTE },
    ]);

    const stats = await getDashboardStats();

    // 1. Sessions à venir
    // Total = 2, This month = 1 (session-up-1 starts today/monthStart)
    expect(stats.sessions.total).toBe(2);
    expect(stats.sessions.increase).toBe(1);

    // 2. Stagiaires formés
    // present = 2
    expect(stats.trainees.total).toBe(2);
    expect(stats.trainees.increase).toBe(2);

    // 3. Taux de réussite
    // Acquis = 1, Total inscriptions in completed = 3
    // 1/3 = 33.33% -> 33
    expect(stats.successRate.percentage).toBe(33);

    // 4. Taux de présence
    // Validé = 2, Total = 4
    // 2/4 = 50%
    expect(stats.presence.percentage).toBe(50);
  });

  it("gère le cas où il n'y a pas de données", async () => {
    mockAuthenticatedUser("org-1");

    mockPrisma.trainingSession.findMany.mockResolvedValue([]);
    mockPrisma.emargement.findMany.mockResolvedValue([]);

    const stats = await getDashboardStats();

    expect(stats.sessions.total).toBe(0);
    expect(stats.trainees.total).toBe(0);
    expect(stats.successRate.percentage).toBe(0);
    expect(stats.presence.percentage).toBe(100); // Default value in my implementation
  });
});
