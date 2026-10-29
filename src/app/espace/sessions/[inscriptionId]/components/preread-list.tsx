"use client";

import { useTransition } from "react";
import { Check, Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPreReadDownloadUrl } from "../../../welcome-actions";
import type { PreReadView } from "../types";

export function PreReadItem({
  inscriptionId,
  document,
}: {
  inscriptionId: string;
  document: PreReadView;
}) {
  const [pending, startTransition] = useTransition();

  if (document.availableLabel) {
    return (
      <li
        aria-disabled="true"
        className="text-muted-foreground flex items-center gap-3 px-4 py-3"
      >
        <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg opacity-60">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{document.title}</span>
          <span className="block text-xs">
            Disponible le {document.availableLabel}
          </span>
        </span>
      </li>
    );
  }

  function download() {
    startTransition(async () => {
      const result = await getPreReadDownloadUrl(
        inscriptionId,
        document.source,
        document.id
      );
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
        className="h-auto min-h-14 w-full justify-between gap-3 rounded-none px-4 py-3 text-left whitespace-normal"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{document.title}</span>
            <span className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
              {document.sizeLabel}
              {document.opened && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 text-green-900 dark:bg-green-950 dark:text-green-200">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  Lu
                </span>
              )}
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

export function PrereadList({
  inscriptionId,
  documents,
}: {
  inscriptionId: string;
  documents: PreReadView[];
}) {
  return (
    <section
      id="pre-lecture"
      aria-labelledby="preread-title"
      className="scroll-mt-6 space-y-3"
    >
      <h2 id="preread-title" className="text-lg font-semibold">
        À lire avant la session
      </h2>
      <ul className="bg-card divide-y overflow-hidden rounded-xl border">
        {documents.map((document) => (
          <PreReadItem
            key={`${document.source}:${document.id}`}
            inscriptionId={inscriptionId}
            document={document}
          />
        ))}
      </ul>
    </section>
  );
}
