import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  signAndPublishAttestations,
  unpublishAttestations,
} from "./attestations";
import { requireOrganisme } from "@/lib/context";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const mockPrisma = vi.hoisted(() => ({
  trainingSession: { findFirst: vi.fn(), update: vi.fn() },
  attestationSignature: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));
const mockR2 = vi.hoisted(() => ({
  getStorageKey: vi.fn(
    (org: string, type: string, name: string) =>
      `dev/organisme/${org}/${type}/${name}`
  ),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));
const mockDeliver = vi.hoisted(() => vi.fn());
const mockRender = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/context", () => ({ requireOrganisme: vi.fn() }));
vi.mock("@/lib/r2", () => mockR2);
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn().mockResolvedValue("1.2.3.4"),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ "user-agent": "Vitest" })),
}));
vi.mock("@/lib/trainee-access-delivery", () => ({
  deliverAccessToAll: mockDeliver,
}));
vi.mock("../lib/pdf-attestation-fin-formation-psc-export", () => ({
  renderSignedAttestationPDF: mockRender,
}));

const user = {
  id: "u1",
  organismeId: "org-1",
  firstName: "Jean",
  lastName: "DUPONT",
};

function session(overrides = {}) {
  return {
    id: "s1",
    organismeId: "org-1",
    title: "PSC",
    location: "Lyon",
    startDate: null,
    endDate: null,
    slots: [],
    formateurs: [{ userId: "u1" }],
    organisme: { id: "org-1" },
    inscriptions: [
      {
        id: "i1",
        attestationResult: "acquis",
        attestationValidatedAt: new Date(),
        trainee: {},
      },
      {
        id: "i2",
        attestationResult: "non_acquis",
        attestationValidatedAt: new Date(),
        trainee: {},
      },
    ],
    ...overrides,
  };
}

describe("signAndPublishAttestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      user as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockResolvedValue([]);
    mockRender.mockResolvedValue(Buffer.from("pdf-i1"));
  });

  it("refuses a session from another organisme", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(null);
    await expect(
      signAndPublishAttestations("s-x", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Session introuvable");
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("refuses a user who is not assigned to the session", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      session({ formateurs: [{ userId: "other" }] })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Seul un formateur de la session peut signer.");
    expect(mockR2.uploadFile).not.toHaveBeenCalled();
  });

  it("refuses when results are missing", async () => {
    mockPrisma.trainingSession.findFirst.mockResolvedValue(
      session({
        inscriptions: [{ id: "i1", attestationResult: null, trainee: {} }],
      })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("1 stagiaire sans résultat.");
  });

  it("refuses when a signature is already active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({ id: "sig" });
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Attestations déjà signées.");
  });

  it("renders only acquis attestations and stores their SHA-256", async () => {
    await signAndPublishAttestations("s1", {
      signaturePng: PNG,
      notify: false,
    });

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockR2.uploadFile).toHaveBeenCalledWith(
      expect.stringMatching(/attestations\/s1\/.+\/i1\.pdf$/),
      Buffer.from("pdf-i1"),
      "application/pdf",
      true
    );
    const create = mockPrisma.attestationSignature.create.mock.calls[0][0];
    expect(create.data).toMatchObject({
      trainingSessionId: "s1",
      signerId: "u1",
      signerName: "DUPONT Jean",
      ipAddress: "1.2.3.4",
      userAgent: "Vitest",
    });
    expect(create.data.attestations.create).toEqual([
      expect.objectContaining({
        inscriptionId: "i1",
        sha256: createHash("sha256").update("pdf-i1").digest("hex"),
        size: 6,
      }),
    ]);
  });

  it("deletes uploaded files when the transaction fails", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("db down"));
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("db down");
    // image du tracé + PDF de i1
    expect(mockR2.deleteFile).toHaveBeenCalledTimes(2);
  });

  it("maps a unique violation (double submit) to a readable error", async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    await expect(
      signAndPublishAttestations("s1", { signaturePng: PNG, notify: false })
    ).rejects.toThrow("Attestations déjà signées.");
  });

  it("notifies only trainees whose attestation is available", async () => {
    mockDeliver.mockResolvedValue({ sent: 1, missingEmail: 0, failed: 0 });
    await signAndPublishAttestations("s1", { signaturePng: PNG, notify: true });
    expect(mockDeliver).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "i1" })],
      expect.objectContaining({ id: "s1" }),
      "attestation"
    );
  });
});

describe("unpublishAttestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrganisme).mockResolvedValue(
      user as unknown as Awaited<ReturnType<typeof requireOrganisme>>
    );
    mockPrisma.trainingSession.findFirst.mockResolvedValue(session());
    mockPrisma.$transaction.mockResolvedValue([]);
  });

  it("revokes the active signature and deletes its files", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({
      id: "sig",
      signatureImageKey: "k/signature.png",
      attestations: [{ fileKey: "k/i1.pdf" }],
    });

    await unpublishAttestations("s1");

    expect(mockPrisma.attestationSignature.update).toHaveBeenCalledWith({
      where: { id: "sig" },
      data: { revokedAt: expect.any(Date), revokedById: "u1" },
    });
    expect(mockR2.deleteFile).toHaveBeenCalledWith("k/signature.png");
    expect(mockR2.deleteFile).toHaveBeenCalledWith("k/i1.pdf");
  });

  it("only unpublishes a session published before signatures existed", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    await unpublishAttestations("s1");
    expect(mockPrisma.attestationSignature.update).not.toHaveBeenCalled();
    expect(mockR2.deleteFile).not.toHaveBeenCalled();
  });
});
