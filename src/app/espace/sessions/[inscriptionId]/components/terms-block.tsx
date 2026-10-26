"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatParisDay } from "../../../lib/format";
import { acceptTerms, getTermsDownloadUrl } from "../../../welcome-actions";

export function TermsBlock({
  inscriptionId,
  acceptedAtLabel: initialAcceptedLabel,
}: {
  inscriptionId: string;
  /** « 3 novembre » si déjà acceptées */
  acceptedAtLabel: string | null;
}) {
  const id = useId();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedAtLabel, setAcceptedAtLabel] = useState(initialAcceptedLabel);
  const [accepting, startAccept] = useTransition();
  const [opening, startOpen] = useTransition();

  function openPdf() {
    startOpen(async () => {
      const result = await getTermsDownloadUrl(inscriptionId);
      if (result.ok) window.location.assign(result.url);
      else toast.error(result.error);
    });
  }

  function accept() {
    setError(null);
    startAccept(async () => {
      const result = await acceptTerms(inscriptionId);
      if (result.ok)
        setAcceptedAtLabel(formatParisDay(new Date(result.acceptedAt)));
      else setError(result.error);
    });
  }

  const pdfLink = (
    <Button
      type="button"
      variant="link"
      onClick={openPdf}
      disabled={opening}
      className="h-auto min-h-11 px-0"
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      Lire les conditions (PDF)
    </Button>
  );

  return (
    <div
      id="conditions"
      className="bg-muted/30 scroll-mt-20 space-y-2 rounded-lg border p-3"
    >
      <p className="text-sm font-medium">Conditions générales</p>
      <div aria-live="polite">
        {acceptedAtLabel && (
          <p className="text-success flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Conditions acceptées le {acceptedAtLabel}
          </p>
        )}
      </div>
      {pdfLink}
      {!acceptedAtLabel && (
        <div className="space-y-2">
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox
              id={`${id}-accept`}
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              aria-describedby={error ? `${id}-error` : undefined}
              className="size-5"
            />
            <Label htmlFor={`${id}-accept`} className="text-sm font-normal">
              J&apos;ai lu et j&apos;accepte les conditions générales
            </Label>
          </div>
          <Button
            type="button"
            onClick={accept}
            disabled={!checked || accepting}
            className="min-h-11"
          >
            Accepter
          </Button>
          {error && (
            <p id={`${id}-error`} className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
