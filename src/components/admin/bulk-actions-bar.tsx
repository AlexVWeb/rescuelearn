"use client";

import * as React from "react";
import { Archive, ArchiveRestore, Trash, X } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import type { BulkContentAction } from "@/lib/content-archive";

interface BulkActionsBarProps {
  count: number;
  /** Libellé pluriel des éléments, ex. "quiz" ou "carte(s)" */
  itemLabel: string;
  deleteWarning?: string;
  onAction: (action: BulkContentAction) => Promise<void>;
  onClear: () => void;
}

export function BulkActionsBar({
  count,
  itemLabel,
  deleteWarning,
  onAction,
  onClear,
}: BulkActionsBarProps) {
  const [pending, setPending] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (count === 0) return null;

  const run = async (action: BulkContentAction) => {
    setPending(true);
    try {
      await onAction(action);
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
      <span className="text-sm font-medium">
        {count} {itemLabel} sélectionné(s)
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={pending}
        aria-label="Vider la sélection"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run("archive")}
        >
          <Archive className="mr-2 h-4 w-4" /> Archiver
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run("restore")}
        >
          <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash className="mr-2 h-4 w-4" /> Supprimer
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {count} {itemLabel} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.{" "}
              {deleteWarning ??
                "Préférez l'archivage pour simplement masquer ces contenus."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                run("delete");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
