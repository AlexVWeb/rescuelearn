import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/email", () => ({
  EmailService: {
    send: vi.fn().mockResolvedValue({ success: true, method: "smtp" }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { sendDemoRequestAction } from "@/app/(public)/formations/actions";
import { EmailService } from "@/lib/email";

describe("sendDemoRequestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate input data and send email successfully", async () => {
    const validData = {
      name: "Alice Liddell",
      company: "Wonderland Corp",
      email: "alice@wonderland.com",
      phone: "0612345678",
      message: "Bonjour, je voudrais une démo.",
    };

    const result = await sendDemoRequestAction(validData);

    expect(result.success).toBe(true);
    expect(result.method).toBe("smtp");
    expect(EmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: "Demande de démo RescueLearn - Wonderland Corp",
        text: expect.stringContaining("Alice Liddell"),
      })
    );
  });

  it("should return validation errors if invalid data is provided", async () => {
    const invalidData = {
      name: "A", // too short
      company: "",
      email: "invalid-email",
      phone: "123", // too short
    };

    const result = await sendDemoRequestAction(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Données invalides");
    expect(result.issues).toHaveProperty("name");
    expect(result.issues).toHaveProperty("company");
    expect(result.issues).toHaveProperty("email");
    expect(result.issues).toHaveProperty("phone");
    expect(EmailService.send).not.toHaveBeenCalled();
  });

  it("should silently discard the email and report success if honeypot is filled", async () => {
    const spamData = {
      name: "Spammer",
      company: "Spam Company",
      email: "spammer@spam.com",
      phone: "0600000000",
      website: "http://spam.com",
    };

    const result = await sendDemoRequestAction(spamData);

    expect(result.success).toBe(true);
    expect(result.method).toBe("honeypot");
    expect(EmailService.send).not.toHaveBeenCalled();
  });

  it("should handle service errors gracefully", async () => {
    vi.mocked(EmailService.send).mockRejectedValueOnce(
      new Error("SMTP failure")
    );

    const validData = {
      name: "Alice Liddell",
      company: "Wonderland Corp",
      email: "alice@wonderland.com",
      phone: "0612345678",
    };

    const result = await sendDemoRequestAction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Une erreur est survenue lors de l'envoi.");
  });
});
