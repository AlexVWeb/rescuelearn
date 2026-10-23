"use client";

import { useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertTriangle, CheckCircle2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SessionFormateurUser } from "@/app/admin/training/types";

const NO_FORMATEUR = "none";

function formateurLabel(user: SessionFormateurUser) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function CapacityBadge({ count, max }: { count: number; max: number | null }) {
  const over = max !== null && count > max;
  const full = max !== null && count === max;
  const Icon = over ? AlertTriangle : full ? CheckCircle2 : null;
  const description =
    max !== null
      ? `${count} apprenants sur ${max} maximum${
          over ? ", ratio dépassé" : full ? ", complet" : ""
        }`
      : `${count} apprenants`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        over
          ? "bg-destructive/15 text-destructive"
          : full
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-muted text-muted-foreground"
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      <span aria-hidden>{max !== null ? `${count}/${max}` : count}</span>
      <span className="sr-only">{description}</span>
    </span>
  );
}

interface GroupColumnProps {
  id: string;
  itemIds: string[];
  max: number | null;
  readOnly: boolean;
  children: ReactNode;
  // Absents pour la colonne « Non affectés »
  group?: { name: string; formateurId: string | null };
  formateurs?: SessionFormateurUser[];
  onRename?: (name: string) => void;
  onFormateurChange?: (formateurId: string | null) => void;
  onDelete?: () => void;
}

export function GroupColumn({
  id,
  itemIds,
  max,
  readOnly,
  children,
  group,
  formateurs = [],
  onRename,
  onFormateurChange,
  onDelete,
}: GroupColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: readOnly });
  // Pas de resynchro nécessaire : le parent remonte l'onglet quand un nom change (boardKey)
  const [name, setName] = useState(group?.name ?? "");
  const title = group?.name ?? "Non affectés";

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed) return setName(group?.name ?? "");
    if (trimmed !== group?.name) onRename?.(trimmed);
  }

  // Le formateur référent peut avoir été retiré de la session entre-temps
  const formateurId =
    group?.formateurId && formateurs.some((f) => f.id === group.formateurId)
      ? group.formateurId
      : NO_FORMATEUR;

  return (
    <section
      aria-label={title}
      className={cn(
        "bg-muted/40 flex min-h-48 flex-col rounded-lg border",
        !group && "border-dashed",
        isOver && "border-primary bg-primary/5 ring-primary/30 ring-2"
      )}
    >
      <header className="space-y-2 border-b p-3">
        <div className="flex items-center gap-2">
          {group && !readOnly ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setName(group.name);
                  e.currentTarget.blur();
                }
              }}
              aria-label="Nom du groupe"
              maxLength={100}
              className="hover:border-input focus-visible:border-input h-11 min-w-0 flex-1 border-transparent bg-transparent px-2 font-semibold shadow-none dark:bg-transparent"
            />
          ) : (
            <h3 className="flex-1 font-semibold">{title}</h3>
          )}
          <CapacityBadge count={itemIds.length} max={group ? max : null} />
          {group && !readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={`Actions du ${title}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  Supprimer le groupe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {group && (
          <Select
            value={formateurId}
            onValueChange={(v) =>
              onFormateurChange?.(v === NO_FORMATEUR ? null : v)
            }
            disabled={readOnly}
          >
            <SelectTrigger
              className="h-11 w-full text-sm"
              aria-label={`Formateur référent du ${title}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_FORMATEUR}>Sans formateur</SelectItem>
              {formateurs.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {formateurLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex flex-1 flex-col gap-2 p-3">
          {children}
          {itemIds.length === 0 && (
            <li className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed p-4 text-center text-sm">
              {readOnly ? "Aucun apprenant" : "Déposez des apprenants ici"}
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
