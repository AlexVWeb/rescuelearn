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
import {
  deleteKitDocument,
  updateKitDocument,
} from "@/app/admin/training/actions";
import type { KitDocumentView } from "./welcome-kit-editor";

export function KitDocumentRow({
  document,
  sizeLabel,
}: {
  document: KitDocumentView;
  sizeLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function save(formData: FormData) {
    const title = String(formData.get("title") ?? "");
    const days = String(formData.get("visibleDaysBefore") ?? "").trim();
    startTransition(async () => {
      try {
        await updateKitDocument(document.id, {
          title,
          visibleDaysBefore: days === "" ? null : Number(days),
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
        await deleteKitDocument(document.id);
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
        <Badge variant="outline">
          {document.visibleDaysBefore === null
            ? "Dès l'envoi des accès"
            : `Visible J-${document.visibleDaysBefore}`}
        </Badge>
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
              <Label htmlFor={`kit-title-${document.id}`}>Titre</Label>
              <Input
                id={`kit-title-${document.id}`}
                name="title"
                defaultValue={document.title}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`kit-days-${document.id}`}>
                Visible J- (jours avant le début)
              </Label>
              <Input
                id={`kit-days-${document.id}`}
                name="visibleDaysBefore"
                type="number"
                inputMode="numeric"
                min={0}
                max={90}
                step={1}
                defaultValue={document.visibleDaysBefore ?? ""}
                aria-describedby={`kit-days-hint-${document.id}`}
              />
              <p
                id={`kit-days-hint-${document.id}`}
                className="text-muted-foreground text-xs"
              >
                Ex. : 7 pour une semaine avant, à minuit. Laissez vide pour le
                rendre visible dès l&apos;envoi des accès.
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
              Il disparaît de toutes les sessions qui utilisent ce modèle. Le
              fichier est supprimé définitivement.
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
