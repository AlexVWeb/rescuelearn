import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assertAttestationsNotSigned,
  SIGNED_LOCK_MESSAGE,
} from "./attestation-signature";

const mockPrisma = vi.hoisted(() => ({
  attestationSignature: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("assertAttestationsNotSigned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when no signature is active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue(null);
    await expect(assertAttestationsNotSigned("s1")).resolves.toBeUndefined();
    expect(mockPrisma.attestationSignature.findFirst).toHaveBeenCalledWith({
      where: { trainingSessionId: "s1", revokedAt: null },
      select: { id: true },
    });
  });

  it("throws when a signature is active", async () => {
    mockPrisma.attestationSignature.findFirst.mockResolvedValue({ id: "sig" });
    await expect(assertAttestationsNotSigned("s1")).rejects.toThrow(
      SIGNED_LOCK_MESSAGE
    );
  });
});
