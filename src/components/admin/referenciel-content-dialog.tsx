"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  bulkReferencielContentAction,
  getReferencielContentCountsAction,
  ReferencielContentCounts,
} from "@/app/actions/referenciel-actions";
import type { BulkContentAction } from "@/lib/content-archive";

type Target = "quizzes" | "cards";

const ACTION_LABEL: Record<BulkContentAction, string> = {
  archive: "archivé(s)",
  restore: "restauré(s)",
  delete: "supprimé(s)",
};

interface ReferencielContentDialogProps {
  referenciel: { id: number; title: string } | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Actions de masse sur les quiz et cartes d'un référentiel : à utiliser quand
 * une nouvelle version paraît pour déprécier tout le contenu de l'ancienne.
 */
export function ReferencielContentDialog({
  referenciel,
  onOpenChange,
}: ReferencielContentDialogProps) {
  const router = useRouter();
  const [counts, setCounts] = React.useState<ReferencielContentCounts | null>(
    null
  );
  const [targets, setTargets] = React.useState<Set<Target>>(
    new Set(["quizzes", "cards"])
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const loadCounts = React.useCallback(async (id: number) => {
    setCounts(null);
    const result = await getReferencielContentCountsAction(id);
    if (result.success) setCounts(result.data);
    else toast.error(result.error);
  }, []);

  React.useEffect(() => {
    if (!referenciel) return;
    setTargets(new Set(["quizzes", "cards"]));
    setConfirmDelete(false);
    loadCounts(referenciel.id);
  }, [referenciel, loadCounts]);

  const toggleTarget = (target: Target, checked: boolean) => {
    setConfirmDelete(false);
    setTargets((prev) => {
      const next = new Set(prev);
      if (checked) next.add(target);
      else next.delete(target);
      return next;
    });
  };

  const sum = (pick: (c: { active: number; archived: number }) => number) =>
    counts
      ? (targets.has("quizzes") ? pick(counts.quizzes) : 0) +
        (targets.has("cards") ? pick(counts.cards) : 0)
      : 0;
  const activeCount = sum((c) => c.active);
  const archivedCount = sum((c) => c.archived);

  const run = async (action: BulkContentAction) => {
    if (!referenciel) return;
    setPending(true);
    try {
      const result = await bulkReferencielContentAction({
        id: referenciel.id,
        action,
        targets: [...targets],
      });
      if (!result.success || !result.data) {
        toast.error(result.error || "Impossible de traiter les contenus");
        return;
      }
      toast.success(
        `${result.data.quizzes} quiz et ${result.data.cards} carte(s) ${ACTION_LABEL[action]}`
      );
      setConfirmDelete(false);
      router.refresh();
      await loadCounts(referenciel.id);
    } finally {
      setPending(false);
    }
  };

  const disabled = pending || !counts || targets.size === 0;

  return (
    <Dialog open={!!referenciel} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contenus liés au référentiel</DialogTitle>
          <DialogDescription>
            {referenciel?.title} — archivez les quiz et cartes générés depuis ce
            référentiel lorsqu&apos;une nouvelle version le remplace. Les
            contenus archivés sont masqués aux joueurs mais restent
            restaurables.
          </DialogDescription>
        </DialogHeader>

        {!counts ? (
          <div className="flex justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {(
              [
                ["quizzes", "Quiz", counts.quizzes],
                ["cards", "Cartes d'apprentissage", counts.cards],
              ] as const
            ).map(([target, label, c]) => (
              <div
                key={target}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <Checkbox
                  id={`target-${target}`}
                  checked={targets.has(target)}
                  onCheckedChange={(v) => toggleTarget(target, !!v)}
                  disabled={pending}
                />
                <Label htmlFor={`target-${target}`} className="flex-1">
                  {label}
                </Label>
                <span className="text-muted-foreground text-sm">
                  {c.active} actif(s) · {c.archived} archivé(s)
                </span>
              </div>
            ))}
            <p className="text-muted-foreground text-xs">
              Les questions des banques de progression et les parcours ne sont
              pas concernés.
            </p>
          </div>
        )}

        {confirmDelete && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
            Suppression définitive de {activeCount + archivedCount} élément(s),
            questions et sessions de quiz comprises. Cette action est
            irréversible.
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {confirmDelete ? (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={() => run("delete")}
                disabled={disabled}
              >
                <Trash className="mr-2 h-4 w-4" /> Confirmer la suppression
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={disabled || activeCount + archivedCount === 0}
              >
                <Trash className="mr-2 h-4 w-4" /> Supprimer
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => run("restore")}
                  disabled={disabled || archivedCount === 0}
                >
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer (
                  {archivedCount})
                </Button>
                <Button
                  onClick={() => run("archive")}
                  disabled={disabled || activeCount === 0}
                >
                  <Archive className="mr-2 h-4 w-4" /> Archiver ({activeCount})
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
