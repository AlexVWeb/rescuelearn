"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Copy, Check } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { deleteTrainingSession } from "../../actions";

interface DeleteSessionButtonProps {
  sessionId: string;
  sessionTitle: string;
}

export function DeleteSessionButton({
  sessionId,
  sessionTitle,
}: DeleteSessionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTrainingSession(sessionId);
        toast.success("Session supprimée avec succès");
        setOpen(false);
        router.refresh();
      } catch (error) {
        logger.error("Failed to delete session", error);
        toast.error("Erreur lors de la suppression de la session");
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionTitle);
    setIsCopied(true);
    toast.success("Titre copié dans le presse-papier");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la formation ?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Cette action est irréversible. Cela supprimera définitivement la
              session <strong>{sessionTitle}</strong> et toutes les données
              associées (créneaux, inscriptions, émargements).
            </p>
            <div className="bg-muted flex items-center justify-between rounded-md p-2 text-sm">
              <code className="font-mono font-medium">{sessionTitle}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopy}
                type="button"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">
                Veuillez saisir le nom de la formation pour confirmer :
              </p>
              <Input
                value={confirmTitle}
                onChange={(e) => setConfirmTitle(e.target.value)}
                placeholder={sessionTitle}
                className="focus-visible:ring-destructive"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmTitle("")}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmTitle !== sessionTitle || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Suppression..." : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
