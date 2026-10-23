"use client";

import { useState, useTransition } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { CircleCheck, RefreshCw, Send } from "lucide-react";
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
  publishAttestations,
  unpublishAttestations,
} from "@/app/admin/training/actions";
import { getAttestationState } from "@/lib/trainee-attestation";
import type { Inscription } from "@/app/admin/training/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

export function AttestationsPublication({
  sessionId,
  publishedAt,
  inscriptions,
}: {
  sessionId: string;
  publishedAt: Date | null;
  inscriptions: Inscription[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notify, setNotify] = useState(true);

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

  function publish() {
    startTransition(async () => {
      try {
        const { sent, missingEmail, failed } = await publishAttestations(
          sessionId,
          { notify }
        );
        if (!notify) toast.success("Attestations publiées");
        else {
          const parts = [plural(sent, "stagiaire prévenu")];
          if (missingEmail) parts.push(`${missingEmail} sans email`);
          if (failed) parts.push(plural(failed, "échec"));
          const message = `Attestations publiées · ${parts.join(" · ")}`;
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
              Publiées le {dayjs(publishedAt).format("DD/MM [à] HH:mm")} ·{" "}
              {plural(available.length, "attestation")} téléchargeable
              {available.length > 1 ? "s" : ""}
            </span>
          ) : (
            `${plural(available.length, "attestation")} prête${available.length > 1 ? "s" : ""} à publier sur ${inscriptions.length}. Les stagiaires non acquis ou sans résultat ne voient qu'un message les invitant à attendre votre contact.`
          )}
        </CardDescription>
        <CardAction>
          {publishedAt ? (
            <Button variant="outline" onClick={unpublish} disabled={pending}>
              Dépublier
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={pending || available.length === 0}
            >
              {pending ? (
                <RefreshCw
                  className="h-4 w-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Publier
            </Button>
          )}
        </CardAction>
      </CardHeader>
      {!publishedAt && available.length === 0 && (
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Saisissez d&apos;abord les résultats dans Clôturer › Résultats.
          </p>
        </CardContent>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier les attestations ?</AlertDialogTitle>
            <AlertDialogDescription>
              {plural(available.length, "stagiaire")} pourr
              {available.length > 1 ? "ont" : "a"} télécharger son attestation
              depuis son espace.
              {missingResult.length > 0 &&
                ` ${plural(missingResult.length, "stagiaire")} sans résultat saisi ne verr${missingResult.length > 1 ? "ont" : "a"} pas d'attestation.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
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
            <AlertDialogAction onClick={publish}>Publier</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
