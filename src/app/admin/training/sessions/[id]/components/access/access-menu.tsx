"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Mail, MoreHorizontal, QrCode } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { revokeAccessLink, sendAccessLink } from "@/app/admin/training/actions";
import type { Inscription } from "@/app/admin/training/types";
import { AccessLinkDialog } from "./access-link-dialog";

export function AccessMenu({ inscription }: { inscription: Inscription }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [linkOpen, setLinkOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const traineeName =
    `${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim() ||
    "ce stagiaire";
  const hasEmail = !!inscription.trainee?.email;

  function send() {
    startTransition(async () => {
      try {
        await sendAccessLink(inscription.id);
        toast.success(`Lien envoyé à ${traineeName}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Envoi impossible");
      }
    });
  }

  function revoke() {
    startTransition(async () => {
      try {
        await revokeAccessLink(inscription.id);
        toast.success("Lien révoqué");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Révocation impossible");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pending}
            aria-label={`Accès à l'espace stagiaire de ${traineeName}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={send} disabled={!hasEmail}>
            <Mail />
            {inscription.accessSentAt && inscription.hasAccessLink
              ? "Renvoyer le lien par email"
              : "Envoyer le lien par email"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLinkOpen(true)}>
            <QrCode />
            Afficher le lien et le QR code
          </DropdownMenuItem>
          {inscription.hasAccessLink && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setRevokeOpen(true)}
              >
                <Ban />
                Révoquer le lien
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AccessLinkDialog
        inscriptionId={inscription.id}
        traineeName={traineeName}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onGenerated={() => router.refresh()}
      />

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Révoquer le lien de {traineeName} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le stagiaire perd immédiatement l&apos;accès à son espace. Vous
              pourrez lui envoyer un nouveau lien plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={revoke}
              className={buttonVariants({ variant: "destructive" })}
            >
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
