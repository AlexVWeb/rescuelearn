import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateDocument } from "./documents";
import { requireOrganisme } from "@/lib/context";

const mockPrisma = vi.hoisted(() => ({
  sessionDocument: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/context", () => ({ requireOrganisme: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("updateDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue({
      id: "user-1",
      organismeId: "org-1",
    } as unknown as Awaited<ReturnType<typeof requireOrganisme>>);
    mockPrisma.sessionDocument.findUnique.mockResolvedValue({
      id: "doc-1",
      trainingSession: { organismeId: "org-1" },
    });
  });

  it("refuse un kind inconnu", async () => {
    await expect(
      updateDocument("doc-1", {
        title: "Fiche",
        visibleFrom: null,
        kind: "autre" as "support",
      })
    ).rejects.toThrow("Type de document inconnu");
    expect(mockPrisma.sessionDocument.update).not.toHaveBeenCalled();
  });

  it("enregistre le kind « preparation »", async () => {
    await updateDocument("doc-1", {
      title: "Fiche",
      visibleFrom: null,
      kind: "preparation",
    });
    expect(mockPrisma.sessionDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { title: "Fiche", visibleFrom: null, kind: "preparation" },
    });
  });
});
