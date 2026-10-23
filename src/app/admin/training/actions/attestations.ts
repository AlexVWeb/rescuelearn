"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "@/lib/context";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/rate-limit";
import { getActiveSignature } from "@/lib/attestation-signature";
import { parseSignaturePng } from "@/lib/signature-image";
import { getAttestationState } from "@/lib/trainee-attestation";
import { deliverAccessToAll } from "@/lib/trainee-access-delivery";
import { formatFormateurName } from "../lib/formateurs";
import { renderSignedAttestationPDF } from "../lib/pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "../types";

const UPLOAD_CONCURRENCY = 5;
const ALREADY_SIGNED = "Attestations déjà signées.";

async function findOwnSession(sessionId: string) {
  const user = await requireOrganisme();
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    include: {
      organisme: true,
      inscriptions: { include: { trainee: true } },
      formateurs: { select: { userId: true } },
      slots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
    },
  });
  if (!session) throw new Error("Session introuvable ou non autorisée");
  return { user, session };
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

/** Ce que l'onglet de clôture doit savoir pour proposer la signature. */
export async function getAttestationSigning(sessionId: string) {
  const { user, session } = await findOwnSession(sessionId);
  const active = await getActiveSignature(session.id);
  return {
    isSessionFormateur: session.formateurs.some((f) => f.userId === user.id),
    signerName: formatFormateurName(user),
    signature: active
      ? {
          id: active.id,
          signerName: active.signerName,
          signedAt: active.signedAt,
          inscriptionIds: active.attestations.map((a) => a.inscriptionId),
        }
      : null,
  };
}

export type AttestationSigning = Awaited<
  ReturnType<typeof getAttestationSigning>
>;

/**
 * Signe et publie les attestations d'une session. Chaque PDF « acquis » est
 * rendu une seule fois, stocké chiffré avec son empreinte : le stagiaire
 * télécharge exactement ce fichier. Avec `notify`, seuls les stagiaires dont
 * l'attestation est disponible reçoivent un mail.
 */
export async function signAndPublishAttestations(
  sessionId: string,
  input: { signaturePng: string; notify: boolean }
) {
  const { user, session } = await findOwnSession(sessionId);

  if (!session.formateurs.some((f) => f.userId === user.id)) {
    throw new Error("Seul un formateur de la session peut signer.");
  }
  if (await getActiveSignature(session.id)) throw new Error(ALREADY_SIGNED);

  const missing = session.inscriptions.filter((i) => !i.attestationResult);
  if (missing.length > 0) {
    throw new Error(`${plural(missing.length, "stagiaire")} sans résultat.`);
  }

  const signerName = formatFormateurName(user);
  if (!signerName) {
    throw new Error(
      "Renseignez vos nom et prénom dans votre profil avant de signer."
    );
  }

  const image = parseSignaturePng(input.signaturePng);
  const signedAt = new Date();
  const available = session.inscriptions.filter(
    (i) => getAttestationState(signedAt, i) === "available"
  );
  if (available.length === 0) throw new Error("Aucune attestation à signer.");

  // Identifiant connu avant le rendu : il est imprimé sur chaque PDF
  const signatureId = randomUUID();
  const signer = {
    name: signerName,
    signedAt,
    signatureId,
    imageDataUrl: input.signaturePng,
  };
  const pdfSession = {
    title: session.title,
    location: session.location,
    startDate: session.startDate,
    endDate: session.endDate,
    slots: session.slots,
  };

  const { deleteFile, getStorageKey, uploadFile } = await import("@/lib/r2");
  const prefix = getStorageKey(
    session.organismeId,
    "attestations",
    `${session.id}/${signatureId}/`
  );
  const imageKey = `${prefix}signature.png`;
  const uploaded: string[] = [];

  try {
    await uploadFile(imageKey, image, "image/png", true);
    uploaded.push(imageKey);

    const files = [];
    for (let i = 0; i < available.length; i += UPLOAD_CONCURRENCY) {
      const batch = available.slice(i, i + UPLOAD_CONCURRENCY);
      files.push(
        ...(await Promise.all(
          batch.map(async (inscription) => {
            const pdf = await renderSignedAttestationPDF(
              pdfSession,
              inscription as unknown as Inscription,
              signer
            );
            const fileKey = `${prefix}${inscription.id}.pdf`;
            await uploadFile(fileKey, pdf, "application/pdf", true);
            uploaded.push(fileKey);
            return {
              inscriptionId: inscription.id,
              fileKey,
              sha256: createHash("sha256").update(pdf).digest("hex"),
              size: pdf.length,
            };
          })
        ))
      );
    }

    const requestHeaders = await headers();
    await prisma.$transaction([
      prisma.attestationSignature.create({
        data: {
          id: signatureId,
          trainingSessionId: session.id,
          signerId: user.id,
          signerName,
          signedAt,
          ipAddress: await getClientIp(),
          userAgent: requestHeaders.get("user-agent"),
          signatureImageKey: imageKey,
          attestations: { create: files },
        },
      }),
      prisma.trainingSession.update({
        where: { id: session.id },
        data: { attestationsPublishedAt: signedAt },
      }),
    ]);
  } catch (err) {
    const results = await Promise.allSettled(
      uploaded.map((k) => deleteFile(k))
    );
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      logger.error(
        `Signature ${signatureId} : ${failures} fichier(s) R2 orphelin(s)`
      );
    }
    // Double clic, deux onglets : l'index unique partiel tranche
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(ALREADY_SIGNED);
    }
    throw err;
  }

  if (!input.notify) return { sent: 0, missingEmail: 0, failed: 0 };
  return deliverAccessToAll(available, session, "attestation");
}

/**
 * Retire les attestations de l'espace stagiaire. La signature est révoquée :
 * la ligne reste (qui, quand, quelles empreintes), les fichiers sont supprimés.
 */
export async function unpublishAttestations(sessionId: string) {
  const { user, session } = await findOwnSession(sessionId);
  const active = await getActiveSignature(session.id);

  await prisma.$transaction([
    prisma.trainingSession.update({
      where: { id: session.id },
      data: { attestationsPublishedAt: null },
    }),
    ...(active
      ? [
          prisma.attestationSignature.update({
            where: { id: active.id },
            data: { revokedAt: new Date(), revokedById: user.id },
          }),
        ]
      : []),
  ]);

  if (!active) return;
  const { deleteFile } = await import("@/lib/r2");
  const keys = [
    active.signatureImageKey,
    ...active.attestations.map((a) => a.fileKey),
  ];
  const results = await Promise.allSettled(keys.map((k) => deleteFile(k)));
  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    logger.error(
      `Révocation ${active.id} : ${failures} fichier(s) R2 non supprimé(s)`
    );
  }
}
