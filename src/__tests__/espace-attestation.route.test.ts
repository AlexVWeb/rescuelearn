import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession = vi.hoisted(() => ({
  getTraineeAccess: vi.fn(),
  getTraineeInscription: vi.fn(),
}));
vi.mock("@/lib/trainee-session", () => mockSession);

const mockPrisma = vi.hoisted(() => ({
  slot: { findMany: vi.fn().mockResolvedValue([]) },
  trainingSessionFormateur: { findMany: vi.fn().mockResolvedValue([]) },
  user: {
    findUnique: vi
      .fn()
      .mockResolvedValue({ firstName: "Hugo", lastName: "Bernard" }),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET } from "@/app/espace/sessions/[inscriptionId]/attestation/route";

function inscription(overrides: {
  publishedAt?: Date | null;
  result?: string | null;
}) {
  return {
    id: "ins-1",
    attestationResult: "result" in overrides ? overrides.result : "acquis",
    attestationValidatedAt: new Date("2026-11-16"),
    trainee: { firstName: "Léa", lastName: "Martin" },
    trainingSession: {
      id: "ts-1",
      title: "PSE1 · Formation initiale",
      location: "Toulouse",
      startDate: new Date("2026-11-12"),
      formateurId: "user-1",
      attestationsPublishedAt:
        "publishedAt" in overrides ? overrides.publishedAt : new Date(),
    },
  };
}

function call(id = "ins-1") {
  return GET(
    new Request(`http://localhost:3000/espace/sessions/${id}/attestation`),
    {
      params: Promise.resolve({ inscriptionId: id }),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.getTraineeAccess.mockResolvedValue({ id: "ins-1" });
});

describe("GET /espace/sessions/[id]/attestation", () => {
  it("renvoie le PDF d'une attestation publiée et acquise", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(inscription({}));

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toContain(
      "Attestation_Martin_L%C3%A9a.pdf"
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("redirige sans session stagiaire", async () => {
    mockSession.getTraineeAccess.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/espace/lien-invalide");
  });

  it("404 si les attestations ne sont pas publiées", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(
      inscription({ publishedAt: null })
    );
    expect((await call()).status).toBe(404);
  });

  it("404 pour un résultat non acquis : rien n'est révélé", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(
      inscription({ result: "non_acquis" })
    );
    expect((await call()).status).toBe(404);
  });

  it("404 pour la formation d'un autre stagiaire", async () => {
    mockSession.getTraineeInscription.mockResolvedValue(null);
    expect((await call("ins-autre")).status).toBe(404);
  });
});
