"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDocument, updateDocument } from "@/app/admin/training/actions";
import type { SessionDocument } from "@/app/admin/training/types";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

// <input type="date"> attend AAAA-MM-JJ, en heure locale
function toDateInput(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DocumentRow({
  document,
  sizeLabel,
}: {
  document: SessionDocument;
  sizeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const visibleFrom = document.visibleFrom
    ? new Date(document.visibleFrom)
    : null;
  const hidden = visibleFrom !== null && visibleFrom > new Date();

  function save(formData: FormData) {
    const title = String(formData.get("title") ?? "");
    const date = String(formData.get("visibleFrom") ?? "");
    startTransition(async () => {
      try {
        await updateDocument(document.id, {
          title,
          // Minuit local du jour choisi
          visibleFrom: date ? new Date(`${date}T00:00:00`) : null,
        });
        setEditOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Modification impossible");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteDocument(document.id);
        toast.success("Document supprimé");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Suppression impossible");
      }
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <FileText
          className="text-muted-foreground h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{document.title}</p>
          <p className="text-muted-foreground text-xs">{sizeLabel}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hidden && (
          <Badge variant="outline">
            Visible le {dayFormat.format(visibleFrom!)}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditOpen(true)}
          disabled={pending}
          aria-label={`Modifier ${document.title}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive h-8 w-8"
          onClick={() => setDeleteOpen(true)}
          disabled={pending}
          aria-label={`Supprimer ${document.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
          </DialogHeader>
          <form action={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`title-${document.id}`}>Titre</Label>
              <Input
                id={`title-${document.id}`}
                name="title"
                defaultValue={document.title}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`visible-${document.id}`}>
                Visible à partir du
              </Label>
              <Input
                id={`visible-${document.id}`}
                name="visibleFrom"
                type="date"
                defaultValue={toDateInput(visibleFrom)}
                aria-describedby={`visible-hint-${document.id}`}
              />
              <p
                id={`visible-hint-${document.id}`}
                className="text-muted-foreground text-xs"
              >
                Laissez vide pour le rendre visible tout de suite (ex. : le
                corrigé d&apos;un QCM, le dernier jour).
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer « {document.title} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les stagiaires ne pourront plus le télécharger. Le fichier est
              supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className={buttonVariants({ variant: "destructive" })}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
