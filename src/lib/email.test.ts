import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { EmailService } from "./email";
import { logger } from "./logger";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-id" }),
    }),
  },
}));

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("EmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "pass";
  });

  describe("send", () => {
    it("should send email via SMTP if host is provided", async () => {
      const result = await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe("smtp");
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it("should fallback to console if SMTP fails", async () => {
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue(new Error("SMTP Error")),
      } as unknown as Transporter;
      vi.mocked(nodemailer.createTransport).mockReturnValue(mockTransporter);

      const result = await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe("console");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("SIMULATION EMAIL")
      );
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should generate a premium HTML template", async () => {
      const result = await EmailService.sendPasswordResetEmail({
        to: "user@test.com",
        resetUrl: "https://rescuelearn.fr/reset-password?token=123",
      });

      expect(result.success).toBe(true);
      const sendMailCall = vi.mocked(nodemailer.createTransport().sendMail);
      const callArgs = sendMailCall.mock.calls[0][0] as SendMailOptions;

      expect(callArgs.to).toBe("user@test.com");
      expect(callArgs.subject).toContain("Réinitialisation");
      expect(callArgs.html).toContain(
        "https://rescuelearn.fr/reset-password?token=123"
      );
      expect(callArgs.html).toContain("RescueLearn");
    });
  });

  describe("sendPasswordChangedNotification", () => {
    it("should send password changed security alert email", async () => {
      const result = await EmailService.sendPasswordChangedNotification({
        to: "user@test.com",
      });

      expect(result.success).toBe(true);
      const sendMailCall = vi.mocked(nodemailer.createTransport().sendMail);
      const callArgs = sendMailCall.mock.calls[0][0] as SendMailOptions;

      expect(callArgs.to).toBe("user@test.com");
      expect(callArgs.subject).toContain("Modification de votre mot de passe");
    });
  });

  describe("sendEmailChangeConfirmation", () => {
    it("should ask the old email to approve the change", async () => {
      const result = await EmailService.sendEmailChangeConfirmation({
        to: "old@test.com",
        newEmail: "new@test.com",
        confirmUrl: "https://app.test/api/auth/verify-email?token=abc",
      });

      expect(result.success).toBe(true);
      const sendMailCall = vi.mocked(nodemailer.createTransport().sendMail);
      const callArgs = sendMailCall.mock.calls[0][0] as SendMailOptions;

      expect(callArgs.to).toBe("old@test.com");
      expect(callArgs.subject).toContain("Confirmez le changement");
      expect(callArgs.html).toContain("new@test.com");
      expect(callArgs.html).toContain(
        "https://app.test/api/auth/verify-email?token=abc"
      );
    });
  });

  describe("sendNewEmailVerification", () => {
    it("should send the verification link to the new email", async () => {
      const result = await EmailService.sendNewEmailVerification({
        to: "new@test.com",
        verificationUrl: "https://app.test/api/auth/verify-email?token=xyz",
      });

      expect(result.success).toBe(true);
      const sendMailCall = vi.mocked(nodemailer.createTransport().sendMail);
      const callArgs = sendMailCall.mock.calls[0][0] as SendMailOptions;

      expect(callArgs.to).toBe("new@test.com");
      expect(callArgs.subject).toContain("Vérifiez votre nouvelle adresse");
      expect(callArgs.html).toContain(
        "https://app.test/api/auth/verify-email?token=xyz"
      );
    });
  });
});
