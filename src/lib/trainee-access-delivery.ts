import { prisma } from "@/lib/prisma";
import { EmailService } from "@/lib/email";
import { logger } from "@/lib/logger";
import { getBaseUrl } from "@/lib/utils";
import { buildAccessUrl, generateAccessToken } from "@/lib/trainee-access";
import { formatSessionDates } from "@/app/espace/lib/format";

// Envoi des liens vers l'espace stagiaire, partagé par l'envoi des accès et
// la publication des attestations. Serveur uniquement.

const SEND_CONCURRENCY = 5;

export type DeliveryReason = "access" | "attestation";
export type DeliveryOutcome = "sent" | "missing_email" | "failed";

interface DeliverableInscription {
  id: string;
  trainee: {
    email: string | null;
    firstName: string | null;
    isAnonymized: boolean;
  };
}

interface DeliverySession {
  title: string;
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  organisme: {
    name: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpFrom: string | null;
    smtpSecure: boolean;
  };
}

/**
 * Le token n'est pas stocké : chaque appel régénère le lien et invalide le
 * précédent. L'envoi et l'ouverture de l'ancien lien ne concernent plus le nouveau.
 */
export async function createAccessLink(inscriptionId: string) {
  const { token, hash } = generateAccessToken();
  await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { accessTokenHash: hash, accessSentAt: null, accessLastUsedAt: null },
  });
  return buildAccessUrl(getBaseUrl(), token);
}

// Le lien est créé avant l'envoi (il doit fonctionner à réception du mail) ;
// accessSentAt n'est posé qu'une fois le mail parti.
export async function deliverAccess(
  inscription: DeliverableInscription,
  session: DeliverySession,
  reason: DeliveryReason = "access"
): Promise<DeliveryOutcome> {
  const { trainee } = inscription;
  if (!trainee.email || trainee.isAnonymized) return "missing_email";

  try {
    const accessUrl = await createAccessLink(inscription.id);
    const { organisme } = session;
    await EmailService.sendTraineeAccess({
      to: trainee.email,
      firstName: trainee.firstName,
      organismeName: organisme.name,
      sessionTitle: session.title,
      sessionDates: formatSessionDates(session.startDate, session.endDate),
      sessionLocation: session.location,
      accessUrl,
      reason,
      smtp: {
        host: organisme.smtpHost,
        port: organisme.smtpPort,
        user: organisme.smtpUser,
        pass: organisme.smtpPassword,
        from: organisme.smtpFrom,
        secure: organisme.smtpSecure,
      },
    });
    await prisma.inscription.update({
      where: { id: inscription.id },
      data: { accessSentAt: new Date() },
    });
    return "sent";
  } catch (error) {
    logger.error("Envoi de l'accès stagiaire impossible", error);
    return "failed";
  }
}

export async function deliverAccessToAll(
  inscriptions: DeliverableInscription[],
  session: DeliverySession,
  reason: DeliveryReason = "access"
) {
  const outcomes: DeliveryOutcome[] = [];
  for (let i = 0; i < inscriptions.length; i += SEND_CONCURRENCY) {
    const batch = inscriptions.slice(i, i + SEND_CONCURRENCY);
    outcomes.push(
      ...(await Promise.all(
        batch.map((inscription) => deliverAccess(inscription, session, reason))
      ))
    );
  }

  return {
    sent: outcomes.filter((o) => o === "sent").length,
    missingEmail: outcomes.filter((o) => o === "missing_email").length,
    failed: outcomes.filter((o) => o === "failed").length,
  };
}
