"use client";

import { useState, useTransition } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { CircleCheck, PenLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  signAndPublishAttestations,
  unpublishAttestations,
  type AttestationSigning,
} from "@/app/admin/training/actions";
import { getAttestationState } from "@/lib/trainee-attestation";
import type { Inscription } from "@/app/admin/training/types";
import { SignaturePad } from "./signature-pad";

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

export function AttestationsPublication({
  sessionId,
  publishedAt,
  inscriptions,
  signing,
}: {
  sessionId: string;
  publishedAt: Date | null;
  inscriptions: Inscription[];
  signing: AttestationSigning;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [signaturePng, setSignaturePng] = useState<string | null>(null);

  // Simulation de la publication : qui pourra télécharger, qui sera recontacté
  const available = inscriptions.filter(
    (i) =>
      getAttestationState(new Date(), {
        attestationResult: i.attestationResult ?? null,
        attestationValidatedAt: i.attestationValidatedAt ?? null,
      }) === "available"
  );
  const missingResult = inscriptions.filter((i) => !i.attestationResult);
  const notifiable = available.filter((i) => i.trainee?.email).length;
  const blockedReason = !signing.isSessionFormateur
    ? "Seul un formateur affecté à la session peut signer les attestations."
    : missingResult.length > 0
      ? `${plural(missingResult.length, "stagiaire")} sans résultat : complétez Clôturer › Résultats.`
      : null;

  function handleConfirmOpenChange(open: boolean) {
    setConfirmOpen(open);
    if (!open) setSignaturePng(null);
  }

  function publish() {
    if (!signaturePng) return;
    startTransition(async () => {
      try {
        const { sent, missingEmail, failed } = await signAndPublishAttestations(
          sessionId,
          {
            signaturePng,
            notify,
          }
        );
        if (!notify) toast.success("Attestations signées et publiées");
        else {
          const parts = [plural(sent, "stagiaire prévenu")];
          if (missingEmail) parts.push(`${missingEmail} sans email`);
          if (failed) parts.push(plural(failed, "échec"));
          const message = `Attestations signées et publiées · ${parts.join(" · ")}`;
          if (failed) toast.warning(message);
          else toast.success(message);
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Publication impossible");
      }
    });
  }

  function unpublish() {
    startTransition(async () => {
      try {
        await unpublishAttestations(sessionId);
        toast.success("Attestations retirées de l'espace stagiaire");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action impossible");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attestations dans l&apos;espace stagiaire</CardTitle>
        <CardDescription>
          {publishedAt ? (
            <span className="flex items-center gap-1.5">
              <CircleCheck
                className="text-success h-4 w-4"
                aria-hidden="true"
              />
              {signing.signature
                ? `Signées par ${signing.signature.signerName} le ${dayjs(signing.signature.signedAt).format("DD/MM [à] HH:mm")}`
                : `Publiées le ${dayjs(publishedAt).format("DD/MM [à] HH:mm")}`}{" "}
              · {plural(available.length, "attestation")} téléchargeable
              {available.length > 1 ? "s" : ""}
            </span>
          ) : (
            `${plural(available.length, "attestation")} prête${available.length > 1 ? "s" : ""} à publier sur ${inscriptions.length}. Les stagiaires non acquis ou sans résultat ne voient qu'un message les invitant à attendre votre contact.`
          )}
        </CardDescription>
        <CardAction>
          {publishedAt ? (
            <Button
              variant="outline"
              onClick={() => setUnpublishOpen(true)}
              disabled={pending}
            >
              Dépublier
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={
                pending || available.length === 0 || blockedReason !== null
              }
            >
              {pending ? (
                <RefreshCw
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <PenLine className="h-4 w-4" aria-hidden="true" />
              )}
              Signer et publier
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {!publishedAt && (blockedReason || available.length === 0) && (
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {blockedReason ??
              "Saisissez d'abord les résultats dans Clôturer › Résultats."}
          </p>
        </CardContent>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Signer les attestations ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous signez {plural(available.length, "attestation")} en tant que{" "}
              <strong className="text-foreground">{signing.signerName}</strong>.
              Chaque attestation est figée : pour corriger un résultat, il
              faudra dépublier puis signer à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <SignaturePad onChange={setSignaturePng} disabled={pending} />
          {notifiable > 0 && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="notify-attestations"
                checked={notify}
                onCheckedChange={(checked) => setNotify(checked === true)}
              />
              <Label
                htmlFor="notify-attestations"
                className="leading-snug font-normal"
              >
                {notifiable > 1
                  ? `Prévenir par email les ${notifiable} stagiaires concernés (un nouveau lien leur est envoyé)`
                  : "Prévenir par email le stagiaire concerné (un nouveau lien lui est envoyé)"}
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={publish}
              disabled={!signaturePng || pending}
            >
              Signer et publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dépublier les attestations ?</AlertDialogTitle>
            <AlertDialogDescription>
              {signing.signature
                ? "La signature est révoquée et les PDF signés supprimés. Les stagiaires ne pourront plus télécharger leur attestation tant que vous n'aurez pas signé à nouveau."
                : "Les stagiaires ne pourront plus télécharger leur attestation tant que vous ne l'aurez pas signée et publiée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={unpublish}>Dépublier</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
