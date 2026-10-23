"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { generateAccessLink } from "@/app/admin/training/actions";

interface AccessLinkDialogProps {
  inscriptionId: string;
  traineeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}

/**
 * Le token n'est jamais stocké : afficher un lien, c'est en créer un nouveau.
 * D'où l'étape de confirmation, qui dit que l'ancien lien cessera de fonctionner.
 */
export function AccessLinkDialog({
  inscriptionId,
  traineeName,
  open,
  onOpenChange,
  onGenerated,
}: AccessLinkDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setUrl(null);
      setCopied(false);
    }
    onOpenChange(next);
  }

  function generate() {
    startTransition(async () => {
      try {
        const result = await generateAccessLink(inscriptionId);
        setUrl(result.url);
        onGenerated();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Impossible de créer le lien"
        );
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien manuellement");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lien d&apos;accès de {traineeName}</DialogTitle>
          <DialogDescription>
            {url
              ? "À scanner sur le téléphone du stagiaire ou à lui transmettre. Ce lien est personnel."
              : "Un nouveau lien va être créé. Si ce stagiaire en a déjà reçu un, l'ancien ne fonctionnera plus."}
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="flex flex-col items-center gap-4">
            {/* Fond blanc imposé : un QR code doit rester sombre sur clair, y compris en mode sombre */}
            <div className="rounded-xl border bg-white p-3">
              <QRCodeSVG
                value={url}
                size={192}
                level="M"
                title={`QR code d'accès de ${traineeName}`}
              />
            </div>
            <div className="flex w-full gap-2">
              <Input
                readOnly
                value={url}
                aria-label="Lien d'accès"
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button variant="outline" onClick={copy} className="shrink-0">
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={generate} disabled={pending}>
              {pending && (
                <RefreshCw
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              )}
              Créer le lien
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
