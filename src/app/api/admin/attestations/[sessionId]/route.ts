import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireOrganisme } from "@/lib/context";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getActiveSignature } from "@/lib/attestation-signature";

/**
 * PDF signés d'une session : `?inscription=<id>` pour un stagiaire, sinon
 * tous fusionnés. La fusion est une copie de travail : la référence reste le
 * fichier individuel et son empreinte.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await requireOrganisme();
  const { sessionId } = await params;

  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, organismeId: user.organismeId },
    select: {
      id: true,
      title: true,
      inscriptions: {
        select: {
          id: true,
          trainee: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  const signature = session ? await getActiveSignature(session.id) : null;
  if (!session || !signature) {
    return new NextResponse("Attestations non signées", { status: 404 });
  }

  const inscriptionId = req.nextUrl.searchParams.get("inscription");
  const files = inscriptionId
    ? signature.attestations.filter((a) => a.inscriptionId === inscriptionId)
    : signature.attestations;
  if (files.length === 0) {
    return new NextResponse("Attestation introuvable", { status: 404 });
  }

  try {
    const { getFile } = await import("@/lib/r2");
    const buffers = await Promise.all(
      files.map(async (f) => (await getFile(f.fileKey, true)).buffer)
    );

    let body: Uint8Array;
    let fileName: string;
    if (inscriptionId) {
      const trainee = session.inscriptions.find(
        (i) => i.id === inscriptionId
      )?.trainee;
      body = new Uint8Array(buffers[0]);
      fileName = `Attestation_${trainee?.lastName}_${trainee?.firstName}.pdf`;
    } else {
      const merged = await PDFDocument.create();
      for (const buffer of buffers) {
        const source = await PDFDocument.load(buffer);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      }
      body = await merged.save();
      fileName = `Attestations_${session.title.replace(/\s+/g, "_")}.pdf`;
    }

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error(
      `Attestations signées ${signature.id} illisibles sur R2`,
      error
    );
    return new NextResponse("Attestations indisponibles", { status: 500 });
  }
}
