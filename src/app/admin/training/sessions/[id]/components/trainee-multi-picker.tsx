"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Trainee } from "../../../types";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

interface TraineeMultiPickerProps {
  trainees: Trainee[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Nombre maximum de stagiaires sélectionnables (places restantes) */
  maxSelectable: number;
  disabled?: boolean;
  className?: string;
}

export function TraineeMultiPicker({
  trainees,
  selected,
  onChange,
  maxSelectable,
  disabled,
  className,
}: TraineeMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const limitReached = selected.length >= maxSelectable;

  const filtered = useMemo(() => {
    const q = normalize(query);
    const sorted = [...trainees].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "fr"
      )
    );
    if (!q) return sorted;
    return sorted.filter((t) =>
      normalize(
        `${t.firstName} ${t.lastName} ${t.lastName} ${t.firstName} ${t.email ?? ""}`
      ).includes(q)
    );
  }, [trainees, query]);

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (!limitReached) {
      onChange([...selected, id]);
    }
  }

  const visibleUnselected = filtered.filter((t) => !selectedSet.has(t.id));
  const allVisibleSelected =
    filtered.length > 0 && visibleUnselected.length === 0;

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(filtered.map((t) => t.id));
      onChange(selected.filter((id) => !visibleIds.has(id)));
      return;
    }
    const room = Math.max(0, maxSelectable - selected.length);
    onChange([
      ...selected,
      ...visibleUnselected.slice(0, room).map((t) => t.id),
    ]);
  }

  const label =
    selected.length === 0
      ? "Sélectionner des stagiaires"
      : selected.length === 1
        ? (() => {
            const t = trainees.find((tr) => tr.id === selected[0]);
            return t ? `${t.firstName} ${t.lastName}` : "1 stagiaire";
          })()
        : `${selected.length} stagiaires sélectionnés`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Stagiaires à inscrire"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal sm:w-[300px]",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0"
      >
        <div className="relative border-b">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault();
                toggle(filtered[0].id);
              }
            }}
            placeholder="Rechercher par nom ou email…"
            aria-label="Rechercher un stagiaire"
            className="h-10 rounded-none border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>

        {trainees.length > 0 && (
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={
                filtered.length === 0 || (limitReached && !allVisibleSelected)
              }
              className="text-primary font-medium hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {allVisibleSelected
                ? "Tout désélectionner"
                : query
                  ? "Sélectionner les résultats"
                  : "Tout sélectionner"}
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-muted-foreground inline-flex items-center gap-1 hover:underline"
              >
                <X className="h-3 w-3" /> Effacer ({selected.length})
              </button>
            )}
          </div>
        )}

        <div
          role="listbox"
          aria-multiselectable="true"
          className="max-h-72 overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {trainees.length === 0
                ? "Aucun stagiaire disponible"
                : "Aucun résultat"}
            </p>
          ) : (
            filtered.map((trainee) => {
              const checked = selectedSet.has(trainee.id);
              const itemDisabled = !checked && limitReached;
              return (
                <label
                  key={trainee.id}
                  role="option"
                  aria-selected={checked}
                  aria-disabled={itemDisabled}
                  className={cn(
                    "hover:bg-accent flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm",
                    itemDisabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={itemDisabled}
                    onCheckedChange={() => toggle(trainee.id)}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {trainee.firstName} {trainee.lastName}
                    </span>
                    {trainee.email && (
                      <span className="text-muted-foreground truncate text-xs">
                        {trainee.email}
                      </span>
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {limitReached && maxSelectable > 0 && (
          <p
            role="status"
            className="text-muted-foreground border-t px-3 py-2 text-xs"
          >
            Limite atteinte : {maxSelectable} place
            {maxSelectable > 1 ? "s" : ""} restante
            {maxSelectable > 1 ? "s" : ""}.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
