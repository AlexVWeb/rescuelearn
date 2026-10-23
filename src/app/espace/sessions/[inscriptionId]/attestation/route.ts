import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getActiveSignature } from "@/lib/attestation-signature";
import { getAttestationState } from "@/lib/trainee-attestation";
import { getTraineeAccess, getTraineeInscription } from "@/lib/trainee-session";
import { toPdfFormateur } from "@/app/admin/training/lib/formateurs";
import {
  attestationFileName,
  renderAttestationPDF,
} from "@/app/admin/training/lib/pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "@/app/admin/training/types";

const NAME_SELECT = { firstName: true, lastName: true } as const;

function pdfResponse(pdf: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Attestation PDF du stagiaire : fichier signé et stocké ; rendu à la volée
 * pour les sessions publiées avant la signature.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ inscriptionId: string }> }
) {
  const access = await getTraineeAccess();
  if (!access) {
    return NextResponse.redirect(new URL("/espace/lien-invalide", request.url));
  }

  const { inscriptionId } = await params;
  const inscription = await getTraineeInscription(access, inscriptionId);
  // 404 identique dans tous les cas : ne révèle ni l'existence ni le résultat
  if (
    !inscription ||
    getAttestationState(
      inscription.trainingSession.attestationsPublishedAt,
      inscription
    ) !== "available"
  ) {
    return new NextResponse("Attestation indisponible", { status: 404 });
  }

  const pdfInscription = inscription as unknown as Inscription;
  const fileName = attestationFileName(pdfInscription);
  const signed = await prisma.signedAttestation.findFirst({
    where: { inscriptionId: inscription.id, signature: { revokedAt: null } },
  });
  if (signed) {
    try {
      const { getFile } = await import("@/lib/r2");
      const { buffer } = await getFile(signed.fileKey, true);
      return pdfResponse(buffer, fileName);
    } catch (error) {
      logger.error(`Attestation signée ${signed.id} illisible sur R2`, error);
      return new NextResponse("Attestation indisponible", { status: 404 });
    }
  }
  // Signature active sans fichier pour ce stagiaire : jamais de version non signée
  if (await getActiveSignature(inscription.trainingSessionId)) {
    return new NextResponse("Attestation indisponible", { status: 404 });
  }

  // Sinon : session publiée avant la signature, rendu à la volée comme avant
  const session = inscription.trainingSession;
  const [slots, formateurs, owner] = await Promise.all([
    prisma.slot.findMany({
      where: { trainingSessionId: session.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.trainingSessionFormateur.findMany({
      where: { trainingSessionId: session.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: NAME_SELECT } },
    }),
    prisma.user.findUnique({
      where: { id: session.formateurId },
      select: NAME_SELECT,
    }),
  ]);

  const formateur = toPdfFormateur(
    formateurs.map(({ user }) => user),
    owner ?? { firstName: null, lastName: null }
  );
  const pdf = await renderAttestationPDF(
    {
      title: session.title,
      location: session.location,
      startDate: session.startDate,
      endDate: session.endDate,
      slots,
    },
    pdfInscription,
    formateur
  );

  return pdfResponse(pdf, fileName);
}
