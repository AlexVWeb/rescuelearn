import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  updateProfileAction,
  updatePasswordAction,
  requestPasswordResetFromProfileAction,
} from "./profile-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "better-auth/crypto";
import { EmailService } from "@/lib/email";
import { APIError } from "better-auth/api";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/email", () => ({
  EmailService: {
    sendPasswordChangedNotification: vi
      .fn()
      .mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      requestPasswordReset: vi.fn(),
      changeEmail: vi.fn(),
    },
  },
}));

vi.mock("better-auth/crypto", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed-new-password"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;
type AccountResult = Awaited<ReturnType<typeof prisma.account.findFirst>>;
type UserUpdateResult = Awaited<ReturnType<typeof prisma.user.update>>;
type AccountUpdateResult = Awaited<ReturnType<typeof prisma.account.update>>;

describe("profile-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfileAction", () => {
    it("should return unauthorized if no session", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });

      expect(res).toEqual({ success: false, error: "Non autorisé" });
    });

    it("should update user profile successfully when email is unchanged", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "john@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.user.update).mockResolvedValueOnce(
        {} as unknown as UserUpdateResult
      );

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });

      expect(res).toEqual({ success: true, emailChangePending: false });
      expect(auth.api.changeEmail).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      });
    });

    it("should return error if email changed but no current password provided", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "old@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "new@example.com",
      });

      expect(res).toEqual({
        success: false,
        error: "Mot de passe actuel requis pour modifier l'adresse e-mail.",
      });
    });

    it("should return error if email changed and current password is wrong", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "old@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed-password",
      } as unknown as AccountResult);

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "new@example.com",
        currentPassword: "wrongpassword",
      });

      expect(res).toEqual({
        success: false,
        error: "Mot de passe actuel incorrect.",
      });
    });

    it("should request a confirmed email change instead of updating the email", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "old@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed-password",
      } as unknown as AccountResult);

      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(prisma.user.update).mockResolvedValueOnce(
        {} as unknown as UserUpdateResult
      );

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "New@Example.com",
        currentPassword: "correctpassword",
        profilePath: "/player/profil",
      });

      expect(res).toEqual({ success: true, emailChangePending: true });
      // L'email n'est jamais écrit directement : seul le nom est mis à jour
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          firstName: "John",
          lastName: "Doe",
          name: "John Doe",
        },
      });
      expect(auth.api.changeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { newEmail: "new@example.com", callbackURL: "/player/profil" },
        })
      );
    });

    it("should fall back to the admin profile for an unknown callback path", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "old@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed-password",
      } as unknown as AccountResult);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);

      await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "new@example.com",
        currentPassword: "correctpassword",
        profilePath: "https://evil.example" as "/admin/profile",
      });

      expect(auth.api.changeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { newEmail: "new@example.com", callbackURL: "/admin/profile" },
        })
      );
    });

    it("should return an error if the new email is already used", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "old@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed-password",
      } as unknown as AccountResult);
      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(auth.api.changeEmail).mockRejectedValueOnce(
        new APIError("UNPROCESSABLE_ENTITY", { message: "exists" })
      );

      const res = await updateProfileAction({
        firstName: "John",
        lastName: "Doe",
        email: "taken@example.com",
        currentPassword: "correctpassword",
      });

      expect(res).toEqual({
        success: false,
        error: "Cet email est déjà utilisé",
      });
    });
  });

  describe("updatePasswordAction", () => {
    it("should return unauthorized if no session", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

      const res = await updatePasswordAction({
        currentPassword: "old",
        newPassword: "new",
      });

      expect(res).toEqual({ success: false, error: "Non autorisé" });
    });

    it("should return error if no account found", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "john@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce(null);

      const res = await updatePasswordAction({
        currentPassword: "old",
        newPassword: "new",
      });

      expect(res).toEqual({
        success: false,
        error: "Aucun mot de passe configuré",
      });
    });

    it("should return error if current password is invalid", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "john@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed",
      } as unknown as AccountResult);

      vi.mocked(verifyPassword).mockResolvedValueOnce(false);

      const res = await updatePasswordAction({
        currentPassword: "wrong",
        newPassword: "newpassword123",
      });

      expect(res).toEqual({
        success: false,
        error: "Mot de passe actuel incorrect",
      });
    });

    it("should update password successfully", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-1", email: "john@example.com" },
        session: { id: "sess-1" },
      } as unknown as SessionResult);

      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: "acc-1",
        password: "hashed",
      } as unknown as AccountResult);

      vi.mocked(verifyPassword).mockResolvedValueOnce(true);
      vi.mocked(prisma.account.update).mockResolvedValueOnce(
        {} as unknown as AccountUpdateResult
      );

      const res = await updatePasswordAction({
        currentPassword: "correctpassword",
        newPassword: "newpassword123",
      });

      expect(res).toEqual({ success: true });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { password: "hashed-new-password" },
      });
      expect(EmailService.sendPasswordChangedNotification).toHaveBeenCalledWith(
        {
          to: "john@example.com",
        }
      );
    });
  });

  describe("requestPasswordResetFromProfileAction", () => {
    it("should return unauthorized if no session or no email", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

      const res = await requestPasswordResetFromProfileAction();

      expect(res).toEqual({ success: false, error: "Non autorisé" });
    });

    it("should trigger password reset email for logged in user email", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-123", email: "admin@rescuelearn.fr" },
        session: { id: "sess-123" },
      } as unknown as SessionResult);

      vi.mocked(auth.api.requestPasswordReset).mockResolvedValueOnce(
        true as unknown as Awaited<
          ReturnType<typeof auth.api.requestPasswordReset>
        >
      );

      const res = await requestPasswordResetFromProfileAction();

      expect(res).toEqual({ success: true });
      expect(auth.api.requestPasswordReset).toHaveBeenCalledWith({
        body: {
          email: "admin@rescuelearn.fr",
          redirectTo: expect.stringContaining("/reset-password"),
        },
        headers: expect.anything(),
      });
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce({
        user: { id: "user-123", email: "admin@rescuelearn.fr" },
        session: { id: "sess-123" },
      } as unknown as SessionResult);

      vi.mocked(auth.api.requestPasswordReset).mockRejectedValueOnce(
        new Error("SMTP failure")
      );

      const res = await requestPasswordResetFromProfileAction();

      expect(res).toEqual({
        success: false,
        error:
          "Une erreur est survenue lors de l'envoi de l'e-mail de réinitialisation.",
      });
    });
  });
});
