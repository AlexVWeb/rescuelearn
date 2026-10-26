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

    it("signale l'échec quand le SMTP configuré refuse l'envoi", async () => {
      const mockTransporter = {
        sendMail: vi
          .fn()
          .mockRejectedValue(new Error("550 Mailbox unavailable")),
      } as unknown as Transporter;
      vi.mocked(nodemailer.createTransport).mockReturnValueOnce(
        mockTransporter
      );

      const result = await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
      });

      // Plus de repli silencieux sur la console : l'email n'est pas parti
      expect(result).toEqual({
        success: false,
        method: "smtp",
        error: "550 Mailbox unavailable",
      });
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining("SIMULATION EMAIL")
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it("simule l'envoi en console hors production sans SMTP", async () => {
      delete process.env.SMTP_HOST;

      const result = await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
      });

      expect(result).toEqual({ success: true, method: "console" });
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it("échoue en production sans SMTP plutôt que de simuler", async () => {
      delete process.env.SMTP_HOST;
      vi.stubEnv("NODE_ENV", "production");

      const result = await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
      });

      expect(result).toEqual({
        success: false,
        method: "none",
        error: "Aucun serveur SMTP configuré",
      });
      vi.unstubAllEnvs();
    });

    it("utilise le SMTP de l'organisme en priorité", async () => {
      await EmailService.send({
        to: "dest@test.com",
        subject: "Test",
        text: "Hello",
        smtp: { host: "smtp.organisme.test", port: 465, secure: true },
      });

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ host: "smtp.organisme.test", port: 465 })
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

  describe("sendTraineeAccess", () => {
    it("envoie le lien personnel, échappé dans le HTML", async () => {
      await EmailService.sendTraineeAccess({
        to: "stagiaire@test.com",
        firstName: "Léa",
        organismeName: "Secours <31>",
        sessionTitle: "PSC",
        sessionDates: "12 novembre 2026",
        sessionLocation: "Toulouse",
        accessUrl: "https://app.test/espace/acces#t=abc",
      });
      const callArgs = vi.mocked(nodemailer.createTransport().sendMail).mock
        .calls[0][0] as SendMailOptions;

      expect(callArgs.subject).toBe(
        "Votre espace de formation PSC – Secours <31>"
      );
      expect(callArgs.html).toContain("Secours &lt;31&gt;");
      expect(callArgs.html).toContain("Accéder à mon espace");
      expect(callArgs.text).toContain("https://app.test/espace/acces#t=abc");
    });
  });

  describe("sendEvaluationInvitation", () => {
    const base = {
      to: "stagiaire@test.com",
      firstName: null,
      organismeName: "Secours 31",
      sessionTitle: "PSC",
      sessionDates: "12 novembre 2026",
      sessionLocation: "Toulouse",
      accessUrl: "https://app.test/espace/acces#t=abc",
      closesAtLabel: "12 décembre",
      estimatedMinutes: 3,
    };
    const lastMail = () =>
      vi.mocked(nodemailer.createTransport().sendMail).mock
        .calls[0][0] as SendMailOptions;

    it("invitation à chaud avec la date de fermeture", async () => {
      await EmailService.sendEvaluationInvitation({
        ...base,
        evaluation: "chaud",
        isReminder: false,
      });
      const mail = lastMail();
      expect(mail.subject).toBe("Votre avis sur la formation PSC – Secours 31");
      expect(mail.text).toContain("jusqu'au 12 décembre");
      expect(mail.text).toContain("Ne plus recevoir de rappels");
      expect(mail.html).toContain(base.accessUrl);
    });

    it("rappel à froid", async () => {
      await EmailService.sendEvaluationInvitation({
        ...base,
        evaluation: "froid",
        isReminder: true,
      });
      const mail = lastMail();
      expect(mail.subject).toBe(
        "Rappel : Que retenez-vous de votre formation PSC ? – Secours 31"
      );
      expect(mail.text).toContain("Vous n'avez pas encore répondu.");
    });
  });
});
