"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileX, Loader2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  documentTemplateSections,
  type DocumentTemplate,
} from "@/lib/documents/catalog";
import {
  buildTemplateRequestMailto,
  missingFederationDocuments,
  TEMPLATE_DELIVERY_DAYS,
  type DocumentOrganisme,
} from "@/lib/documents/registry";
import { MissingTemplatesAlert } from "@/app/admin/training/sessions/[id]/components/close/missing-templates-alert";
import { PdfThumbnail } from "./pdf-thumbnail";
import { buildTemplatePreview, type PreviewContext } from "./template-preview";

interface TemplatesTabProps {
  organisme: DocumentOrganisme;
  logoBase64: string | null;
}

export function TemplatesTab({ organisme, logoBase64 }: TemplatesTabProps) {
  const sections = documentTemplateSections(
    organisme.federation,
    organisme.federationName
  );
  // Stable entre rendus grâce au React Compiler : sert de clé d'aperçu
  const context: PreviewContext = { organisme, logoBase64 };

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground text-sm">
        Aperçus générés avec une session fictive, le logo et l&apos;en-tête de
        votre organisme. Modifiez l&apos;en-tête dans l&apos;onglet Profil.
      </p>

      {missingFederationDocuments(organisme.federation) && (
        <MissingTemplatesAlert organisme={organisme} />
      )}

      {sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-base font-semibold">{section.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.templates.map((template) =>
              template.available ? (
                <TemplateCard
                  key={template.id}
                  template={template}
                  context={context}
                />
              ) : (
                <MissingTemplateCard
                  key={template.id}
                  template={template}
                  organisme={organisme}
                />
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function TemplateBadges({ template }: { template: DocumentTemplate }) {
  return (
    <Badge variant={template.formation === "Commun" ? "secondary" : "default"}>
      {template.formation}
    </Badge>
  );
}

function TemplateCard({
  template,
  context,
}: {
  template: DocumentTemplate;
  context: PreviewContext;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  // Résultat lié au contexte qui l'a produit : un contexte modifié repart en chargement
  const [preview, setPreview] = useState<{
    context: PreviewContext;
    blob: Blob | null;
  } | null>(null);
  const [open, setOpen] = useState(false);

  // Génère l'aperçu seulement quand la carte approche de l'écran
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Régénère si l'en-tête, la fédération ou le logo changent
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    buildTemplatePreview(template.id, context)
      .then((blob) => {
        if (!cancelled) setPreview({ context, blob });
      })
      .catch((e) => {
        logger.error(e);
        if (!cancelled) setPreview({ context, blob: null });
      });
    return () => {
      cancelled = true;
    };
  }, [visible, template.id, context]);

  const current = preview?.context === context ? preview : null;
  const blob = current?.blob ?? null;
  const failed = !!current && !current.blob;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        disabled={!blob}
        className="group bg-card hover:border-primary focus-visible:ring-ring overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait"
      >
        <div className="bg-muted/40 flex aspect-[3/4] items-center justify-center overflow-hidden border-b">
          {blob ? (
            <PdfThumbnail
              blob={blob}
              title={template.title}
              page={template.page}
            />
          ) : failed ? (
            <div className="text-muted-foreground flex h-full items-center p-4 text-center text-xs">
              Aperçu indisponible
            </div>
          ) : (
            <Skeleton className="h-full w-full rounded-none" />
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">{template.title}</span>
            <TemplateBadges template={template} />
          </div>
          <p className="text-muted-foreground text-xs">
            {template.description}
          </p>
        </div>
      </button>

      {blob && (
        <TemplatePreviewDialog
          open={open}
          onOpenChange={setOpen}
          template={template}
          blob={blob}
        />
      )}
    </>
  );
}

function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  blob,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
  blob: Blob;
}) {
  const url = useMemo(
    () => (open ? URL.createObjectURL(blob) : null),
    [open, blob]
  );
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const fileName = `Modele_${template.title.replace(/[^\w]+/g, "_")}.pdf`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>
            Aperçu avec des données fictives.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
          {url ? (
            <iframe
              src={template.page ? `${url}#page=${template.page}` : url}
              title={`Aperçu : ${template.title}`}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button asChild disabled={!url}>
            <a href={url ?? undefined} download={fileName}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MissingTemplateCard({
  template,
  organisme,
}: {
  template: DocumentTemplate;
  organisme: DocumentOrganisme;
}) {
  return (
    <div className="bg-muted/20 overflow-hidden rounded-lg border border-dashed">
      <div className="text-muted-foreground flex aspect-[3/4] flex-col items-center justify-center gap-3 border-b border-dashed p-4 text-center">
        <FileX className="h-8 w-8" />
        <p className="text-xs">
          Modèle non disponible pour votre fédération. Intégré sous{" "}
          {TEMPLATE_DELIVERY_DAYS} jours ouvrés après réception.
        </p>
        <Button asChild size="sm" variant="outline">
          <a href={buildTemplateRequestMailto(organisme)}>
            <Mail className="mr-2 h-4 w-4" />
            Envoyer mes modèles
          </a>
        </Button>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium">{template.title}</span>
          <TemplateBadges template={template} />
        </div>
        <p className="text-muted-foreground text-xs">{template.description}</p>
      </div>
    </div>
  );
}
