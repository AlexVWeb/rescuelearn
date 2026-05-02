import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUpcomingSessions,
  getAllSessions,
  getMonOrganisme,
  getSessionDetails,
  createTrainingSession,
  updateTrainingSession,
  deleteTrainingSession,
  getFormateur,
} from "./sessions";
import {
  requireOrganisme,
  getUserContext,
  getTenantPrisma,
} from "@/lib/context";
import { TrainingSessionService } from "../services/session.service";

// --- Mocks ---

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
  getUserContext: vi.fn(),
  getTenantPrisma: vi.fn(),
}));

vi.mock("../services/session.service", () => ({
  TrainingSessionService: {
    getSessionById: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

const mockPrisma = {
  trainingSession: {
    findMany: vi.fn(),
  },
  organisme: {
    findUnique: vi.fn(),
  },
};

describe("Session Actions", () => {
  const mockUser = {
    id: "user-1",
    organismeId: "org-1",
    firstName: "Jean",
    lastName: "Dupont",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    vi.mocked(getUserContext).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof getUserContext>>
    );
    vi.mocked(getTenantPrisma).mockResolvedValue(
      mockPrisma as unknown as Awaited<ReturnType<typeof getTenantPrisma>>
    );
  });

  it("getUpcomingSessions returns filtered sessions", async () => {
    mockPrisma.trainingSession.findMany.mockResolvedValue([{ id: "s1" }]);

    const result = await getUpcomingSessions();

    expect(result).toHaveLength(1);
    expect(mockPrisma.trainingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.any(Object),
        }),
      })
    );
  });

  it("getAllSessions returns all sessions", async () => {
    mockPrisma.trainingSession.findMany.mockResolvedValue([
      { id: "s1" },
      { id: "s2" },
    ]);

    const result = await getAllSessions();

    expect(result).toHaveLength(2);
    expect(mockPrisma.trainingSession.findMany).toHaveBeenCalled();
  });

  it("getMonOrganisme returns the current organism", async () => {
    mockPrisma.organisme.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
    });

    const result = await getMonOrganisme();

    expect(result?.name).toBe("Test Org");
    expect(mockPrisma.organisme.findUnique).toHaveBeenCalledWith({
      where: { id: "current" },
    });
  });

  it("getSessionDetails calls the service", async () => {
    vi.mocked(TrainingSessionService.getSessionById).mockResolvedValue({
      id: "s1",
    } as unknown as Awaited<
      ReturnType<typeof TrainingSessionService.getSessionById>
    >);

    const result = await getSessionDetails("s1");

    expect(result?.id).toBe("s1");
    expect(TrainingSessionService.getSessionById).toHaveBeenCalledWith(
      "s1",
      "org-1"
    );
  });

  it("createTrainingSession calls the service", async () => {
    const input = { title: "New Session" } as unknown as Parameters<
      typeof createTrainingSession
    >[0];
    vi.mocked(TrainingSessionService.createSession).mockResolvedValue({
      id: "new-s",
    } as unknown as Awaited<
      ReturnType<typeof TrainingSessionService.createSession>
    >);

    const result = await createTrainingSession(input);

    expect(result.id).toBe("new-s");
    expect(TrainingSessionService.createSession).toHaveBeenCalledWith(
      input,
      "org-1",
      "user-1"
    );
  });

  it("updateTrainingSession calls the service", async () => {
    const input = { title: "Updated" } as unknown as Parameters<
      typeof updateTrainingSession
    >[1];
    vi.mocked(TrainingSessionService.updateSession).mockResolvedValue({
      id: "s1",
    } as unknown as Awaited<
      ReturnType<typeof TrainingSessionService.updateSession>
    >);

    const result = await updateTrainingSession("s1", input);

    expect(result.id).toBe("s1");
    expect(TrainingSessionService.updateSession).toHaveBeenCalledWith(
      "s1",
      input,
      "org-1"
    );
  });

  it("deleteTrainingSession calls the service", async () => {
    vi.mocked(TrainingSessionService.deleteSession).mockResolvedValue({
      id: "s1",
    } as unknown as Awaited<
      ReturnType<typeof TrainingSessionService.deleteSession>
    >);

    const result = await deleteTrainingSession("s1");

    expect(result.id).toBe("s1");
    expect(TrainingSessionService.deleteSession).toHaveBeenCalledWith(
      "s1",
      "org-1"
    );
  });

  it("getFormateur returns user details", async () => {
    const result = await getFormateur();

    expect(result).toEqual({
      firstName: "Jean",
      lastName: "Dupont",
    });
  });

  it("getFormateur returns null if user names are missing", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      id: "u1",
    } as unknown as Awaited<ReturnType<typeof getUserContext>>);

    const result = await getFormateur();

    expect(result).toEqual({
      firstName: null,
      lastName: null,
    });
  });
});
