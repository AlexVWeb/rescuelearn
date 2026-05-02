import { describe, it, expect, vi, beforeEach } from "vitest";
import { importTrainees } from "./trainees";
import { requireOrganisme } from "@/lib/context";

// --- Mocks ---

vi.mock("@/lib/context", () => ({
  requireOrganisme: vi.fn(),
  getTenantPrisma: vi.fn(),
}));

const mockPrisma = {
  trainee: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  withOrganisme: vi.fn(() => mockPrisma),
}));

describe("Trainee Actions - importTrainees", () => {
  const mockUser = {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin",
    roles: ["admin"],
    organismeId: "org-1",
    firstName: "Admin",
    lastName: "User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(mockUser);
  });

  it("creates a new trainee if they don't exist", async () => {
    mockPrisma.trainee.findFirst.mockResolvedValue(null);
    mockPrisma.trainee.create.mockResolvedValue({ id: "new-id" });

    const data = [
      {
        firstName: "Lucas",
        lastName: "Bertrand",
        email: "lucas@example.com",
      },
    ];

    const result = await importTrainees(data);

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(mockPrisma.trainee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: "Lucas",
        lastName: "Bertrand",
        email: "lucas@example.com",
        organismeId: "org-1",
      }),
    });
  });

  it("skips a trainee if they already exist (by email)", async () => {
    mockPrisma.trainee.findFirst.mockResolvedValue({ id: "existing-id" });

    const data = [
      {
        firstName: "Lucas",
        lastName: "Bertrand",
        email: "lucas@example.com",
      },
    ];

    const result = await importTrainees(data);

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockPrisma.trainee.create).not.toHaveBeenCalled();
  });

  it("handles errors and returns them", async () => {
    mockPrisma.trainee.findFirst.mockRejectedValue(new Error("DB Error"));

    const data = [
      {
        firstName: "Lucas",
        lastName: "Bertrand",
        email: "lucas@example.com",
      },
    ];

    const result = await importTrainees(data);

    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe("Lucas Bertrand");
  });
});
