import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inviteMemberAction,
  acceptInvitationAction,
  resendInvitationAction,
} from "./invitation.actions";
import { getUserContext } from "@/lib/context";
import { EmailService } from "@/lib/email";
import {
  InviteMemberInput,
  AcceptInvitationInput,
} from "@/lib/schemas/invitation.schema";

// --- Mocks ---
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  invitation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  organisme: {
    findUnique: vi.fn(),
  },
  account: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/context", () => ({
  getUserContext: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  EmailService: {
    sendInvitationEmail: vi.fn(),
  },
}));

vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Invitation Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inviteMemberAction", () => {
    const validPayload: InviteMemberInput = {
      email: "test@example.com",
      role: "FORMATEUR",
      organismeId: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
    };

    it("should fail if input is invalid", async () => {
      const result = await inviteMemberAction({
        ...validPayload,
        email: "invalid",
      } as InviteMemberInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Format d'email invalide");
    });

    it("should fail if user is not authorized", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "u1",
        roles: ["FORMATEUR"],
        organismeId: "org-2",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      const result = await inviteMemberAction(validPayload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("pas les droits");
    });

    it("should attach existing user if they exist", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "u1",
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u2",
        email: "test@example.com",
        roles: ["FORMATEUR"],
        organismeId: null,
      });

      const result = await inviteMemberAction(validPayload);

      expect(result.success).toBe(true);
      expect(result.message).toContain("rattaché");
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it("should create invitation and send email if user does not exist", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "u1",
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.invitation.findUnique.mockResolvedValue(null);
      mockPrisma.organisme.findUnique.mockResolvedValue({
        id: validPayload.organismeId,
        name: "Org 1",
        smtpPort: 587,
        smtpSecure: true,
      });

      const result = await inviteMemberAction(validPayload);

      expect(result.success).toBe(true);
      expect(result.message).toContain("envoyée");
      expect(mockPrisma.invitation.upsert).toHaveBeenCalled();
      expect(EmailService.sendInvitationEmail).toHaveBeenCalled();
    });
  });

  describe("acceptInvitationAction", () => {
    const validAccept: AcceptInvitationInput = {
      token: "token-1",
      password: "Password123!",
      confirmPassword: "Password123!",
      firstName: "John",
      lastName: "Doe",
    };

    it("should create user and account on success", async () => {
      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: "inv-1",
        email: "new@example.com",
        role: "FORMATEUR",
        organismeId: "org-1",
        expiresAt: new Date(Date.now() + 10000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: "u-new" });

      const result = await acceptInvitationAction(validAccept);

      expect(result.success).toBe(true);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.account.create).toHaveBeenCalled();
      expect(mockPrisma.invitation.delete).toHaveBeenCalled();
    });
  });

  describe("resendInvitationAction", () => {
    it("should update token and resend email", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "u1",
        roles: ["SUPER_ADMIN"],
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: "inv-1",
        email: "test@example.com",
        role: "FORMATEUR",
        organismeId: "org-1",
        organisme: { id: "org-1", name: "Org 1" },
      });

      const result = await resendInvitationAction("inv-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.invitation.update).toHaveBeenCalled();
      expect(EmailService.sendInvitationEmail).toHaveBeenCalled();
    });

    it("should fail if unauthorized", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        id: "u1",
        roles: ["FORMATEUR"],
        organismeId: "org-other",
      } as unknown as Awaited<ReturnType<typeof getUserContext>>);

      mockPrisma.invitation.findUnique.mockResolvedValue({
        id: "inv-1",
        organismeId: "org-1",
      });

      const result = await resendInvitationAction("inv-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Non autorisé");
    });
  });
});
