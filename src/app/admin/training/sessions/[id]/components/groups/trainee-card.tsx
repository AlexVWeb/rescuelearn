"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BoardTrainee {
  inscriptionId: string;
  name: string;
  age: number | null;
}

interface TraineeCardProps {
  trainee: BoardTrainee;
  selected: boolean;
  readOnly: boolean;
  targets: { id: string; label: string }[];
  onSelectedChange: (checked: boolean) => void;
  onMove: (targetId: string) => void;
}

export function TraineeCardContent({
  trainee,
  className,
}: {
  trainee: BoardTrainee;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <p className="truncate text-sm font-medium">{trainee.name}</p>
      {trainee.age !== null && (
        <p className="text-muted-foreground text-xs">{trainee.age} ans</p>
      )}
    </div>
  );
}

export function TraineeCard({
  trainee,
  selected,
  readOnly,
  targets,
  onSelectedChange,
  onMove,
}: TraineeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trainee.inscriptionId, disabled: readOnly });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "bg-card flex min-h-11 items-center gap-1 rounded-md border p-1",
        readOnly && "px-3 py-2",
        selected && "border-primary ring-primary/30 ring-2",
        isDragging && "opacity-40"
      )}
    >
      {!readOnly && (
        <>
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label={`Déplacer ${trainee.name}`}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          {/* Le label agrandit la zone cliquable de la case à cocher à 44px */}
          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
            <Checkbox
              checked={selected}
              onCheckedChange={(c) => onSelectedChange(c === true)}
              aria-label={`Sélectionner ${trainee.name}`}
            />
          </label>
        </>
      )}
      <TraineeCardContent trainee={trainee} />
      {!readOnly && targets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`Déplacer ${trainee.name} vers…`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Déplacer vers</DropdownMenuLabel>
            {targets.map((t) => (
              <DropdownMenuItem key={t.id} onSelect={() => onMove(t.id)}>
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
