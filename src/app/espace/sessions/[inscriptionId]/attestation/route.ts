import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAttestationState } from "@/lib/trainee-attestation";
import { getTraineeAccess, getTraineeInscription } from "@/lib/trainee-session";
import { toPdfFormateur } from "@/app/admin/training/lib/formateurs";
import {
  attestationFileName,
  buildAttestationDocument,
} from "@/app/admin/training/lib/pdf-attestation-fin-formation-psc-export";
import type { Inscription } from "@/app/admin/training/types";

const NAME_SELECT = { firstName: true, lastName: true } as const;

/** Attestation PDF du stagiaire, générée à la demande (jamais stockée). */
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
  const pdfInscription = inscription as unknown as Inscription;
  const doc = buildAttestationDocument(
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

  return new NextResponse(doc.output("arraybuffer"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attestationFileName(pdfInscription))}`,
      "Cache-Control": "no-store",
    },
  });
}
