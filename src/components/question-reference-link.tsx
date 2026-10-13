"use client";

import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatQuestionReference,
  openReferencielPdf,
  type QuestionReference,
} from "@/lib/open-referenciel-pdf";

// Lien sous l'explication d'une réponse : ouvre le référentiel à la bonne page
export function QuestionReferenceLink({
  reference,
  className,
}: {
  reference: QuestionReference;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openReferencielPdf(reference.pdfUrl, reference.pageStart ?? 1);
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-left text-sm font-medium text-blue-600 hover:text-blue-800",
        className
      )}
    >
      <BookOpen className="h-4 w-4 shrink-0" />
      <span className="underline decoration-dotted">
        {formatQuestionReference(reference)}
      </span>
    </button>
  );
}
