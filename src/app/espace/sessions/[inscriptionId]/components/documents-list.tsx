"use client";

import { useTransition } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDocumentDownloadUrl } from "../../../actions";
import type { DocumentView } from "../types";

function DocumentItem({
  inscriptionId,
  document,
}: {
  inscriptionId: string;
  document: DocumentView;
}) {
  const [pending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(inscriptionId, document.id);
      if (result.ok) window.location.assign(result.url);
      else toast.error(result.error);
    });
  }

  return (
    <li>
      <Button
        variant="ghost"
        onClick={download}
        disabled={pending}
        className="h-auto w-full justify-between gap-3 px-4 py-3 text-left whitespace-normal"
      >
        <span className="flex min-w-0 items-center gap-3">
          <FileText
            className="text-muted-foreground h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block font-medium">{document.title}</span>
            <span className="text-muted-foreground block text-xs font-normal">
              {document.sizeLabel}
            </span>
          </span>
        </span>
        {pending ? (
          <RefreshCw
            className="h-4 w-4 shrink-0 motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="sr-only">Télécharger</span>
      </Button>
    </li>
  );
}

export function DocumentsList({
  inscriptionId,
  documents,
}: {
  inscriptionId: string;
  documents: DocumentView[];
}) {
  return (
    <section aria-labelledby="documents-title" className="space-y-3">
      <h2 id="documents-title" className="text-lg font-semibold">
        Documents
      </h2>
      <ul className="bg-card divide-y rounded-xl border">
        {documents.map((document) => (
          <DocumentItem
            key={document.id}
            inscriptionId={inscriptionId}
            document={document}
          />
        ))}
      </ul>
    </section>
  );
}
