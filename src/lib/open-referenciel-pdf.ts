import { logger } from "@/lib/logger";

// Lien vers le passage du référentiel qui justifie la réponse d'une question
export interface QuestionReference {
  title: string | null;
  referencielTitle: string;
  pdfUrl: string;
  pageStart: number | null;
  pageEnd: number | null;
}

// Libellé du lien affiché sous l'explication
export function formatQuestionReference(ref: QuestionReference): string {
  const label = ref.title ?? ref.referencielTitle;
  if (ref.pageStart == null) return `Consulter le référentiel : ${label}`;
  const pages =
    ref.pageEnd != null && ref.pageEnd !== ref.pageStart
      ? `p. ${ref.pageStart}-${ref.pageEnd}`
      : `p. ${ref.pageStart}`;
  return `Voir dans le référentiel : ${label} (${pages})`;
}

// Extrait le numéro de page d'une référence texte ("page 6", "Pages 9-10")
export function pageFromReference(reference: string): number {
  const pageMatch = reference.match(/pages?\s*(\d+)/i);
  return pageMatch ? parseInt(pageMatch[1], 10) : 1;
}

// Ouvre le PDF R2 d'un référentiel (URL signée) à la page donnée
export async function openReferencielPdf(pdfUrl: string, page = 1) {
  // Ouvre l'onglet tout de suite (sinon bloqué après l'await sur Safari)
  const win = window.open("", "_blank");
  try {
    const { getPresignedUrlAction } =
      await import("@/app/actions/referenciel-actions");
    const url = await getPresignedUrlAction(pdfUrl);
    const target = `${url}#page=${page}`;
    if (win) {
      win.location.href = target;
    } else {
      window.open(target, "_blank");
    }
  } catch (err) {
    logger.error("Failed to get presigned URL", err);
    win?.close();
  }
}
