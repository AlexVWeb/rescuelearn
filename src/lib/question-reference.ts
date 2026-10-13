import type { Prisma } from "@prisma/client";
import type { QuestionReference } from "@/lib/open-referenciel-pdf";
import { isR2PdfUrl } from "@/lib/referenciel-pdf";

const referencielSelect = { select: { title: true, pdfUrl: true } } as const;

// À inclure sur une Question pour pouvoir construire sa référence
export const questionReferenceInclude = {
  topic: {
    select: {
      title: true,
      pageStart: true,
      pageEnd: true,
      referenciel: referencielSelect,
    },
  },
  quiz: { select: { referenciel: referencielSelect } },
} satisfies Prisma.QuestionInclude;

type ReferencielRef = { title: string; pdfUrl: string };

/**
 * Sujet de la question (page précise), sinon référentiel du quiz (début du
 * PDF). Seuls les PDF stockés sur R2 sont exposés.
 */
export function buildQuestionReference(question: {
  topic: {
    title: string;
    pageStart: number;
    pageEnd: number;
    referenciel: ReferencielRef;
  } | null;
  quiz: { referenciel: ReferencielRef | null };
}): QuestionReference | null {
  const { topic } = question;
  if (topic) {
    if (!isR2PdfUrl(topic.referenciel.pdfUrl)) return null;
    return {
      title: topic.title,
      referencielTitle: topic.referenciel.title,
      pdfUrl: topic.referenciel.pdfUrl,
      pageStart: topic.pageStart,
      pageEnd: topic.pageEnd,
    };
  }
  const referenciel = question.quiz.referenciel;
  if (!referenciel || !isR2PdfUrl(referenciel.pdfUrl)) return null;
  return {
    title: null,
    referencielTitle: referenciel.title,
    pdfUrl: referenciel.pdfUrl,
    pageStart: null,
    pageEnd: null,
  };
}
