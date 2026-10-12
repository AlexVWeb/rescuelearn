"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReferencielSimple {
  id: number;
  title: string;
}

/** Champs à appliquer ; un champ absent n'est pas modifié. */
export interface BulkCardChanges {
  referencielId?: number | null;
  niveau?: string;
  theme?: string;
}

interface BulkEditCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  referenciels: ReferencielSimple[];
  niveaux: string[];
  onSubmit: (changes: BulkCardChanges) => Promise<boolean>;
}

export function BulkEditCardsDialog({
  open,
  onOpenChange,
  count,
  referenciels,
  niveaux,
  onSubmit,
}: BulkEditCardsDialogProps) {
  const [editReferenciel, setEditReferenciel] = useState(false);
  const [referencielId, setReferencielId] = useState("none");
  const [editNiveau, setEditNiveau] = useState(false);
  const [niveau, setNiveau] = useState("");
  const [editTheme, setEditTheme] = useState(false);
  const [theme, setTheme] = useState("");
  const [pending, setPending] = useState(false);

  const reset = () => {
    setEditReferenciel(false);
    setReferencielId("none");
    setEditNiveau(false);
    setNiveau("");
    setEditTheme(false);
    setTheme("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const changes: BulkCardChanges = {
    ...(editReferenciel && {
      referencielId: referencielId === "none" ? null : Number(referencielId),
    }),
    ...(editNiveau && { niveau: niveau.trim() }),
    ...(editTheme && { theme: theme.trim() }),
  };
  const isValid =
    (editReferenciel || editNiveau || editTheme) &&
    (!editNiveau || !!changes.niveau) &&
    (!editTheme || !!changes.theme);

  const handleSubmit = async () => {
    setPending(true);
    try {
      if (await onSubmit(changes)) handleOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier {count} carte(s)</DialogTitle>
          <DialogDescription>
            Cochez les champs à appliquer à toute la sélection. Les autres
            restent inchangés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-referenciel"
                checked={editReferenciel}
                onCheckedChange={(v) => setEditReferenciel(!!v)}
              />
              <Label htmlFor="bulk-referenciel">Référentiel</Label>
            </div>
            <Select
              value={referencielId}
              onValueChange={setReferencielId}
              disabled={!editReferenciel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {referenciels.map((ref) => (
                  <SelectItem key={ref.id} value={ref.id.toString()}>
                    {ref.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-niveau"
                checked={editNiveau}
                onCheckedChange={(v) => setEditNiveau(!!v)}
              />
              <Label htmlFor="bulk-niveau">Niveau</Label>
            </div>
            <Input
              list="bulk-niveaux"
              placeholder="Ex: PSE1, PSC1..."
              value={niveau}
              onChange={(e) => setNiveau(e.target.value)}
              disabled={!editNiveau}
            />
            <datalist id="bulk-niveaux">
              {niveaux.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-theme"
                checked={editTheme}
                onCheckedChange={(v) => setEditTheme(!!v)}
              />
              <Label htmlFor="bulk-theme">Thème</Label>
            </div>
            <Input
              placeholder="Ex: Arrêt cardio-respiratoire..."
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              disabled={!editTheme}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || pending}>
            {pending ? "Enregistrement..." : "Appliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
