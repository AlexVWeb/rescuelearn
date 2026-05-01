import { describe, it, expect, vi, beforeEach } from "vitest";
import { RetentionService } from "./retention-service";
import { prisma } from "./prisma";
import dayjs from "dayjs";
import { Organisme, Trainee } from "@prisma/client";

vi.mock("./prisma", () => ({
  prisma: {
    organisme: {
      findMany: vi.fn(),
    },
    trainee: {
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("./r2", () => ({
  deleteFile: vi.fn(),
}));

vi.mock("./email", () => ({
  EmailService: {
    send: vi.fn().mockResolvedValue({ success: true }),
  },
}));

import { EmailService } from "./email";

describe("RetentionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should identify trainees to alert", async () => {
    const mockOrg = { id: "o1", retentionYearsArchive: 10 };
    const mockTrainees = [{ id: "t1", lastActivityAt: new Date() }];

    vi.mocked(prisma.organisme.findMany).mockResolvedValue([
      mockOrg,
    ] as unknown as Organisme[]);
    vi.mocked(prisma.trainee.findMany).mockResolvedValue(
      mockTrainees as unknown as Trainee[]
    );

    const result = await RetentionService.getTraineesToAlert();

    expect(prisma.organisme.findMany).toHaveBeenCalled();
    expect(prisma.trainee.findMany).toHaveBeenCalled();
    expect(result).toEqual(mockTrainees);
  });

  it("should anonymize inactive trainees", async () => {
    const mockOrg = { id: "o1", retentionYearsActive: 5 };
    const mockTrainee = {
      id: "t1",
      lastActivityAt: dayjs().subtract(6, "years").toDate(),
    };

    vi.mocked(prisma.organisme.findMany).mockResolvedValue([
      mockOrg,
    ] as unknown as Organisme[]);
    vi.mocked(prisma.trainee.findMany).mockResolvedValue([
      mockTrainee,
    ] as unknown as Trainee[]);

    await RetentionService.anonymizeInactiveTrainees();

    expect(prisma.trainee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
      })
    );
  });

  it("should purge expired trainees", async () => {
    const mockOrg = { id: "o1", retentionYearsArchive: 10 };
    const mockTrainee = {
      id: "t1",
      lastActivityAt: dayjs().subtract(11, "years").toDate(),
      externalTrainings: [{ fileKey: "key1" }],
    };

    vi.mocked(prisma.organisme.findMany).mockResolvedValue([
      mockOrg,
    ] as unknown as Organisme[]);
    vi.mocked(prisma.trainee.findMany).mockResolvedValue([
      mockTrainee,
    ] as unknown as Trainee[]);

    await RetentionService.purgeExpiredTrainees();

    expect(prisma.trainee.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
      })
    );
  });

  it("should send retention alerts with SMTP config from organism", async () => {
    const mockOrg = {
      id: "o1",
      email: "org@test.com",
      retentionYearsArchive: 10,
      smtpHost: "smtp.test.com",
      smtpPort: 465,
      smtpUser: "user",
      smtpPassword: "pass",
      smtpFrom: "noreply@test.com",
      smtpSecure: true,
    };
    const mockTrainee = { id: "t1", organismeId: "o1", organisme: mockOrg };

    vi.mocked(prisma.organisme.findMany).mockResolvedValue([
      mockOrg,
    ] as unknown as Organisme[]);
    vi.mocked(prisma.trainee.findMany).mockResolvedValue([
      mockTrainee,
    ] as unknown as Trainee[]);

    await RetentionService.sendRetentionAlerts();

    expect(EmailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "org@test.com",
        smtp: expect.objectContaining({
          host: "smtp.test.com",
          user: "user",
        }),
      })
    );
  });
});
