"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resetSlots } from "../../../actions";

const slotsLabel = (count: number) => `${count} créneau${count > 1 ? "x" : ""}`;

/** Supprime tous les créneaux d'un coup pour repartir d'un programme vide. */
export function ResetSlotsButton({
  sessionId,
  slotCount,
}: {
  sessionId: string;
  slotCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      try {
        const result = await resetSlots(sessionId);
        if (!result.success) {
          toast.error(result.error);
          setOpen(false);
          return;
        }
        toast.success(
          `${slotsLabel(result.deleted)} supprimé${result.deleted > 1 ? "s" : ""}`
        );
        setOpen(false);
        router.refresh();
      } catch (e) {
        logger.error("Failed to reset slots", e);
        toast.error("Les créneaux n'ont pas pu être réinitialisés");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          disabled={isPending}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Réinitialiser les créneaux
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Réinitialiser les {slotsLabel(slotCount)} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tous les créneaux de cette session seront supprimés. Le formulaire
            vous proposera ensuite de les recréer à partir du premier jour de la
            session. Impossible si des émargements sont déjà enregistrés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {isPending
              ? "Suppression…"
              : `Supprimer les ${slotsLabel(slotCount)}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
