import { prisma } from "./prisma";
import { logger } from "./logger";
import { deleteFile } from "./r2";
import { EmailService, SMTPConfig } from "./email";
import dayjs from "dayjs";
import { Trainee, Organisme } from "@prisma/client";

type TraineeWithOrg = Trainee & { organisme: Organisme };

interface OrgAlertGroup {
  orgEmail: string;
  trainees: TraineeWithOrg[];
  smtp?: SMTPConfig;
}

export const RetentionService = {
  async getTraineesToAlert(): Promise<TraineeWithOrg[]> {
    const organismes = await prisma.organisme.findMany();
    const results: TraineeWithOrg[] = [];

    for (const org of organismes) {
      const alertThreshold = dayjs()
        .subtract(org.retentionYearsArchive, "years")
        .add(6, "months") // Alerte 6 mois AVANT la purge
        .toDate();

      const trainees = await prisma.trainee.findMany({
        where: {
          organismeId: org.id,
          isAnonymized: false,
          lastActivityAt: {
            lte: alertThreshold,
          },
        },
        include: {
          organisme: true,
        },
      });
      results.push(...trainees);
    }

    return results;
  },

  async sendRetentionAlerts() {
    const trainees = await this.getTraineesToAlert();
    let emailsSent = 0;

    const byOrg: Record<string, OrgAlertGroup> = {};

    for (const t of trainees) {
      if (!t.organisme.email) continue;
      if (!byOrg[t.organismeId]) {
        byOrg[t.organismeId] = {
          orgEmail: t.organisme.email,
          trainees: [],
          smtp: t.organisme.smtpHost
            ? {
                host: t.organisme.smtpHost,
                port: t.organisme.smtpPort ?? 465,
                user: t.organisme.smtpUser ?? "",
                pass: t.organisme.smtpPassword ?? "",
                from: t.organisme.smtpFrom ?? "",
                secure: t.organisme.smtpSecure,
              }
            : undefined,
        };
      }
      byOrg[t.organismeId].trainees.push(t);
    }

    for (const orgId in byOrg) {
      const { orgEmail, trainees: orgTrainees, smtp } = byOrg[orgId];
      const count = orgTrainees.length;

      await EmailService.send({
        to: orgEmail,
        subject: `[RescueLearn] Alerte de purge de données - ${count} stagiaire(s)`,
        text: `Bonjour,\n\nConformément à votre politique de rétention, ${count} stagiaire(s) vont être purgés définitivement de vos archives dans moins de 6 mois.\n\nVous pouvez consulter la liste dans votre espace administration.\n\nCordialement,\nL'équipe RescueLearn`,
        smtp,
      });
      emailsSent++;
    }

    return emailsSent;
  },

  async anonymizeInactiveTrainees() {
    const organismes = await prisma.organisme.findMany();
    let totalAnonymized = 0;

    for (const org of organismes) {
      const threshold = dayjs()
        .subtract(org.retentionYearsActive, "years")
        .toDate();

      const inactiveTrainees = await prisma.trainee.findMany({
        where: {
          organismeId: org.id,
          isAnonymized: false,
          lastActivityAt: {
            lte: threshold,
          },
        },
      });

      for (const trainee of inactiveTrainees) {
        await prisma.trainee.update({
          where: { id: trainee.id },
          data: {
            firstName: null,
            lastName: null,
            email: null,
            emailHash: null,
            phone: null,
            address: null,
            isAnonymized: true,
          },
        });
        totalAnonymized++;
      }
    }

    return totalAnonymized;
  },

  async purgeExpiredTrainees() {
    const organismes = await prisma.organisme.findMany();
    let totalPurged = 0;

    for (const org of organismes) {
      const threshold = dayjs()
        .subtract(org.retentionYearsArchive, "years")
        .toDate();

      const expiredTrainees = await prisma.trainee.findMany({
        where: {
          organismeId: org.id,
          lastActivityAt: {
            lte: threshold,
          },
        },
        include: {
          externalTrainings: true,
        },
      });

      for (const trainee of expiredTrainees) {
        for (const training of trainee.externalTrainings) {
          if (training.fileKey) {
            try {
              await deleteFile(training.fileKey);
            } catch (error) {
              logger.error(
                `Erreur suppression fichier R2 ${training.fileKey}:`,
                error
              );
            }
          }
        }

        await prisma.trainee.delete({
          where: { id: trainee.id },
        });
        totalPurged++;
      }
    }

    return totalPurged;
  },

  async touchTrainee(traineeId: string) {
    return prisma.trainee.update({
      where: { id: traineeId },
      data: { lastActivityAt: new Date() },
    });
  },
};
