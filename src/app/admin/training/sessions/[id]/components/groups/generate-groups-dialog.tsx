"use client";

import { useState } from "react";
import { AlertTriangle, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GROUP_STRATEGY_LABELS,
  balancedSizes,
  defaultGroupCount,
  getMaxPerGroup,
  type GroupStrategy,
} from "@/app/admin/training/lib/group-rules";

interface GenerateGroupsDialogProps {
  sessionType: string;
  traineeCount: number;
  formateurCount: number;
  hasExistingGroups: boolean;
  disabled?: boolean;
  onGenerate: (options: { count: number; strategy: GroupStrategy }) => void;
}

export function GenerateGroupsDialog({
  sessionType,
  traineeCount,
  formateurCount,
  hasExistingGroups,
  disabled,
  onGenerate,
}: GenerateGroupsDialogProps) {
  const suggested = defaultGroupCount(
    sessionType,
    traineeCount,
    formateurCount
  );
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(suggested);
  const [strategy, setStrategy] = useState<GroupStrategy>("random");

  const max = getMaxPerGroup(sessionType);
  const safeCount = Math.min(
    Math.max(1, count || 1),
    Math.max(1, traineeCount)
  );
  const sizes = balancedSizes(traineeCount, safeCount);
  const overCapacity = max !== null && sizes.some((s) => s > max);

  function handleOpenChange(next: boolean) {
    if (next) setCount(suggested);
    setOpen(next);
  }

  function submit() {
    onGenerate({ count: safeCount, strategy });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="min-h-11" disabled={disabled || traineeCount === 0}>
          <Shuffle className="h-4 w-4" aria-hidden />
          Générer les groupes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer les groupes</DialogTitle>
          <DialogDescription>
            {traineeCount} apprenants, {formateurCount} formateur(s) affecté(s).
            {max !== null &&
              ` ${sessionType} : ${max} apprenants maximum par formateur.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-count">Nombre de groupes</Label>
            <Input
              id="group-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={traineeCount}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-describedby="group-count-hint"
              className="h-11"
            />
            <p id="group-count-hint" className="text-muted-foreground text-sm">
              Suggestion : {suggested} (1 groupe par formateur, ratio respecté).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-strategy">Répartition</Label>
            <Select
              value={strategy}
              onValueChange={(v) => setStrategy(v as GroupStrategy)}
            >
              <SelectTrigger id="group-strategy" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GROUP_STRATEGY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm" aria-live="polite">
            <p>Aperçu : {sizes.join(" · ")} apprenants</p>
            {overCapacity && (
              <p className="text-destructive mt-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                Au moins un groupe dépasse le ratio de {max}.
              </p>
            )}
          </div>

          {hasExistingGroups && (
            <p className="text-destructive flex items-center gap-1.5 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Les groupes existants seront remplacés.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setOpen(false)}
          >
            Annuler
          </Button>
          <Button className="min-h-11" onClick={submit}>
            {hasExistingGroups ? "Remplacer les groupes" : "Générer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
