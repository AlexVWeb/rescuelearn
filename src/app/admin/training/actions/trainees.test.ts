import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllTrainees,
  getTraineeWithHistory,
  createTrainee,
  updateTrainee,
  deleteTrainee,
  importAndEnrollTrainees,
  importTrainees,
} from "./trainees";
import { requireOrganisme, getTenantPrisma } from "@/lib/context";
import { withOrganisme } from "@/lib/prisma";
import dayjs from "dayjs";
import {
  computeValidCompetences,
  computeNextExpiry,
} from "../lib/trainee-validity";

// --- Mocks ---

const mockPrisma = vi.hoisted(() => ({
  trainee: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  trainingSession: {
    findFirst: vi.fn(),
  },
  inscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
  getTenantPrisma: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  withOrganisme: vi.fn().mockReturnValue(mockPrisma),
}));

vi.mock("../lib/trainee-validity", () => ({
  computeValidCompetences: vi.fn(),
  computeNextExpiry: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
  hash: vi.fn((val) => `hashed-${val}`),
}));

describe("Trainee Actions", () => {
  const mockUser = {
    id: "user-1",
    organismeId: "org-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      mockUser as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    vi.mocked(getTenantPrisma).mockResolvedValue(
      mockPrisma as unknown as Awaited<ReturnType<typeof getTenantPrisma>>
    );
    vi.mocked(withOrganisme).mockReturnValue(
      mockPrisma as unknown as ReturnType<typeof withOrganisme>
    );
  });

  describe("getAllTrainees", () => {
    it("returns all trainees with calculated validity", async () => {
      const mockTrainees = [
        {
          id: "t1",
          firstName: "John",
          lastName: "Doe",
          inscriptions: [],
          externalTrainings: [],
          _count: { inscriptions: 0 },
        },
      ];
      mockPrisma.trainee.findMany.mockResolvedValue(mockTrainees);
      vi.mocked(computeValidCompetences).mockReturnValue(["PSC"]);
      vi.mocked(computeNextExpiry).mockReturnValue({
        expiryDate: dayjs("2025-01-01"),
        type: "PSC",
      });

      const result = await getAllTrainees();

      expect(result).toHaveLength(1);
      expect(result[0].validCompetences).toEqual(["PSC"]);
      expect(result[0].nextExpiry).toBe(dayjs("2025-01-01").toISOString());
    });
  });

  describe("getTraineeWithHistory", () => {
    it("returns trainee details and history", async () => {
      const mockTrainee = {
        id: "t1",
        firstName: "John",
        lastName: "Doe",
        inscriptions: [
          {
            trainingSession: {
              type: "PSC",
              status: "planifiée",
              startDate: new Date(),
            },
          },
        ],
        externalTrainings: [],
      };
      mockPrisma.trainee.findFirst.mockResolvedValue(mockTrainee);

      const result = await getTraineeWithHistory("t1");

      expect(result?.firstName).toBe("John");
      expect(result?.inscriptions[0].trainingSession.type).toBe("PSC");
    });

    it("handles trainee with missing dateOfBirth", async () => {
      const mockTrainee = {
        id: "t1",
        firstName: "John",
        dateOfBirth: null,
        inscriptions: [],
        externalTrainings: [],
      };
      mockPrisma.trainee.findFirst.mockResolvedValue(mockTrainee);

      const result = await getTraineeWithHistory("t1");
      expect(result?.dateOfBirth).toBeNull();
    });

    it("returns null if trainee not found", async () => {
      mockPrisma.trainee.findFirst.mockResolvedValue(null);
      const result = await getTraineeWithHistory("none");
      expect(result).toBeNull();
    });

    it("throws error on invalid session type", async () => {
      const mockTrainee = {
        id: "t1",
        inscriptions: [
          {
            trainingSession: {
              type: "INVALID",
              status: "planifiée",
            },
          },
        ],
        externalTrainings: [],
      };
      mockPrisma.trainee.findFirst.mockResolvedValue(mockTrainee);

      await expect(getTraineeWithHistory("t1")).rejects.toThrow(
        "Unexpected session type"
      );
    });

    it("throws error on invalid session status", async () => {
      const mockTrainee = {
        id: "t1",
        inscriptions: [
          {
            trainingSession: {
              type: "PSC",
              status: "INVALID",
            },
          },
        ],
        externalTrainings: [],
      };
      mockPrisma.trainee.findFirst.mockResolvedValue(mockTrainee);

      await expect(getTraineeWithHistory("t1")).rejects.toThrow(
        "Unexpected session status"
      );
    });
  });

  describe("createTrainee", () => {
    it("creates a trainee with dateOfBirth", async () => {
      const dob = new Date("1990-01-01");
      const input = { firstName: "John", lastName: "Doe", dateOfBirth: dob };
      mockPrisma.trainee.create.mockResolvedValue({ id: "t1", ...input });

      await createTrainee(input);

      expect(mockPrisma.trainee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: dob.toISOString(),
          }),
        })
      );
    });

    it("creates a trainee without dateOfBirth", async () => {
      const input = { firstName: "John", lastName: "Doe" };
      mockPrisma.trainee.create.mockResolvedValue({ id: "t1", ...input });

      await createTrainee(input);

      expect(mockPrisma.trainee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: undefined,
          }),
        })
      );
    });
  });

  describe("updateTrainee", () => {
    it("updates a trainee", async () => {
      const input = { firstName: "John", lastName: "Updated" };
      mockPrisma.trainee.update.mockResolvedValue({ id: "t1", ...input });

      const result = await updateTrainee("t1", input);

      expect(result.lastName).toBe("Updated");
      expect(mockPrisma.trainee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1", organismeId: "org-1" },
        })
      );
    });
  });

  describe("deleteTrainee", () => {
    it("deletes a trainee", async () => {
      mockPrisma.trainee.delete.mockResolvedValue({ id: "t1" });

      await deleteTrainee("t1");

      expect(mockPrisma.trainee.delete).toHaveBeenCalledWith({
        where: { id: "t1", organismeId: "org-1" },
      });
    });
  });

  describe("importAndEnrollTrainees", () => {
    it("imports and enrolls new trainees", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.trainee.findFirst.mockResolvedValue(null); // Not existing
      mockPrisma.trainee.create.mockResolvedValue({ id: "new-t" });
      mockPrisma.inscription.findUnique.mockResolvedValue(null); // Not enrolled
      mockPrisma.inscription.create.mockResolvedValue({ id: "ins" });

      const data = [
        { firstName: "New", lastName: "Trainee", email: "new@ex.com" },
      ];
      const result = await importAndEnrollTrainees("s1", data);

      expect(result.created).toBe(1);
      expect(result.enrolled).toBe(1);
      expect(mockPrisma.trainee.create).toHaveBeenCalled();
      expect(mockPrisma.inscription.create).toHaveBeenCalled();
    });

    it("skips enrollment if already enrolled", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "ext-t" });
      mockPrisma.inscription.findUnique.mockResolvedValue({ id: "ext-ins" });

      const data = [
        { firstName: "Ext", lastName: "Trainee", email: "ext@ex.com" },
      ];
      const result = await importAndEnrollTrainees("s1", data);

      expect(result.created).toBe(0);
      expect(result.enrolled).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("handles errors during import and enroll", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue({ id: "s1" });
      mockPrisma.trainee.findFirst.mockRejectedValue(new Error("Loop Error"));

      const data = [
        { firstName: "Error", lastName: "User", email: "err@ex.com" },
      ];
      const result = await importAndEnrollTrainees("s1", data);

      expect(result.errors).toContain("Error User");
    });

    it("throws error if session not found", async () => {
      mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
      await expect(importAndEnrollTrainees("none", [])).rejects.toThrow(
        "Session introuvable"
      );
    });
  });

  describe("importTrainees", () => {
    it("creates new trainees during import", async () => {
      mockPrisma.trainee.findFirst.mockResolvedValue(null);
      mockPrisma.trainee.create.mockResolvedValue({ id: "new-t" });

      const dob = new Date("1995-05-05");
      const data = [
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@ex.com",
          dateOfBirth: dob,
        },
      ];
      const result = await importTrainees(data);

      expect(result.created).toBe(1);
      expect(mockPrisma.trainee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dateOfBirth: dob.toISOString(),
          }),
        })
      );
    });

    it("skips existing trainees", async () => {
      mockPrisma.trainee.findFirst.mockResolvedValue({ id: "t1" });

      const data = [
        { firstName: "John", lastName: "Doe", email: "john@ex.com" },
      ];
      const result = await importTrainees(data);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("handles errors during import", async () => {
      mockPrisma.trainee.findFirst.mockRejectedValue(new Error("DB Error"));

      const data = [
        { firstName: "Error", lastName: "User", email: "err@ex.com" },
      ];
      const result = await importTrainees(data);

      expect(result.errors).toContain("Error User");
    });
  });
});
