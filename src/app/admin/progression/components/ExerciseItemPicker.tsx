"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: number;
  title: string;
  subtitle?: string;
  options?: { text: string; correct?: boolean }[];
}

interface ExerciseItemPickerProps {
  items: PickerItem[];
  selected: PickerItem | null;
  onSelect: (id: number) => void;
  placeholder: string;
  dialogTitle: string;
  searchPlaceholder: string;
  /** Badge affiché sur l'élément sélectionné (ex : question pas encore créée) */
  selectedBadge?: string;
}

// Au-delà, la liste est tronquée : la recherche permet d'affiner
const MAX_VISIBLE_RESULTS = 100;

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function OptionsPreview({ options }: { options: PickerItem["options"] }) {
  if (!options) return null;
  if (options.length === 0) {
    return (
      <p className="mt-2 text-xs font-semibold text-red-600">
        Aucune option de réponse : question inutilisable.
      </p>
    );
  }
  return (
    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
      {options.map((opt, idx) => (
        <li
          key={idx}
          className={cn(
            "flex items-start gap-1.5 rounded-md border px-2 py-1 text-xs",
            opt.correct
              ? "border-green-200 bg-green-50 font-semibold text-green-800"
              : "text-muted-foreground bg-background"
          )}
        >
          <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
          <span className="break-words">{opt.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function ExerciseItemPicker({
  items,
  selected,
  onSelect,
  placeholder,
  dialogTitle,
  searchPlaceholder,
  selectedBadge,
}: ExerciseItemPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return items;
    return items.filter((item) =>
      normalize(`${item.title} ${item.subtitle ?? ""}`).includes(query)
    );
  }, [items, search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  const handleSelect = (id: number) => {
    onSelect(id);
    handleOpenChange(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group w-full min-w-0 rounded-lg border p-3 text-left transition-colors",
          "hover:border-blue-300 hover:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
          !selected && "border-dashed"
        )}
      >
        {selected ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {(selectedBadge || selected.subtitle) && (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {selectedBadge && (
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                      {selectedBadge}
                    </span>
                  )}
                  {selected.subtitle && (
                    <span className="text-muted-foreground rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold">
                      {selected.subtitle}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm font-medium break-words">
                {selected.title}
              </p>
              <OptionsPreview options={selected.options} />
            </div>
            <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs font-semibold group-hover:text-blue-600">
              Changer <ChevronsUpDown className="h-3.5 w-3.5" />
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground flex items-center justify-between text-sm">
            {placeholder}
            <ChevronsUpDown className="h-4 w-4" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              {filtered.length > MAX_VISIBLE_RESULTS &&
                ` (${MAX_VISIBLE_RESULTS} affichés, affinez la recherche)`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Aucun résultat.
              </p>
            ) : (
              filtered.slice(0, MAX_VISIBLE_RESULTS).map((item) => {
                const isSelected = item.id === selected?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-md border p-2.5 text-left transition-colors",
                      isSelected
                        ? "border-blue-300 bg-blue-50"
                        : "border-transparent hover:bg-gray-50"
                    )}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-blue-600",
                        !isSelected && "invisible"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm break-words">{item.title}</p>
                      {(item.subtitle || item.options) && (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {item.subtitle}
                          {item.subtitle && item.options && " · "}
                          {item.options &&
                            (item.options.length === 0 ? (
                              <span className="font-semibold text-red-600">
                                aucune option
                              </span>
                            ) : (
                              `${item.options.length} option${item.options.length > 1 ? "s" : ""}`
                            ))}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
