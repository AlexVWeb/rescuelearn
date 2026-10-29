"use client";

import { useTransition } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDocumentDownloadUrl } from "../../../actions";
import type { DocumentView, PreReadView } from "../types";
import { PreReadItem } from "./preread-list";

export function DocumentItem({
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
        className="h-auto min-h-14 w-full justify-between gap-3 rounded-none px-4 py-3 text-left whitespace-normal"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
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

function Group({
  id,
  title,
  showTitle,
  children,
}: {
  id: string;
  title: string;
  showTitle: boolean;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={showTitle ? id : undefined}>
      {showTitle && (
        <h3
          id={id}
          className="text-muted-foreground px-4 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase"
        >
          {title}
        </h3>
      )}
      <ul className="divide-y">{children}</ul>
    </div>
  );
}

/** Supports de cours et documents à lire avant, dans une seule section */
export function Resources({
  inscriptionId,
  documents,
  preReads,
}: {
  inscriptionId: string;
  documents: DocumentView[];
  preReads: PreReadView[];
}) {
  if (documents.length === 0 && preReads.length === 0) return null;
  const both = documents.length > 0 && preReads.length > 0;

  return (
    <section aria-labelledby="resources-title" className="space-y-3">
      <h2 id="resources-title" className="text-lg font-semibold">
        Ressources
      </h2>
      <div className="bg-card divide-y overflow-hidden rounded-xl border">
        {documents.length > 0 && (
          <Group
            id="resources-supports"
            title="Supports de cours"
            showTitle={both}
          >
            {documents.map((document) => (
              <DocumentItem
                key={document.id}
                inscriptionId={inscriptionId}
                document={document}
              />
            ))}
          </Group>
        )}
        {preReads.length > 0 && (
          <Group
            id="resources-prereads"
            title="À lire avant la session"
            showTitle={both}
          >
            {preReads.map((document) => (
              <PreReadItem
                key={`${document.source}:${document.id}`}
                inscriptionId={inscriptionId}
                document={document}
              />
            ))}
          </Group>
        )}
      </div>
    </section>
  );
}
