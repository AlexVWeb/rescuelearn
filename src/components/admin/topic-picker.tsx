"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TOPICS_PER_GENERATION } from "@/lib/topic-coverage";
import { cn } from "@/lib/utils";

export type PickableTopic = {
  id: string;
  chapter: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  questionCapacity: number;
  _count: { questions: number };
};

interface TopicPickerProps {
  topics: PickableTopic[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  disabled?: boolean;
}

// Sélecteur multi-sujets groupé par chapitre, avec recherche et couverture
export function TopicPicker({
  topics,
  selectedIds,
  onChange,
  max = MAX_TOPICS_PER_GENERATION,
  disabled,
}: TopicPickerProps) {
  const [search, setSearch] = useState("");
  const selected = new Set(selectedIds);
  const isFull = selectedIds.length >= max;

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const map = new Map<string, PickableTopic[]>();
    for (const topic of topics) {
      if (
        query &&
        !topic.title.toLowerCase().includes(query) &&
        !topic.chapter.toLowerCase().includes(query)
      ) {
        continue;
      }
      map.set(topic.chapter, [...(map.get(topic.chapter) ?? []), topic]);
    }
    return Array.from(map, ([chapter, items]) => ({ chapter, items }));
  }, [topics, search]);

  const toggle = (id: string, checked: boolean) =>
    onChange(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((selectedId) => selectedId !== id)
    );

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Rechercher un sujet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <span
          className={cn(
            "text-muted-foreground shrink-0 text-xs tabular-nums",
            isFull && "text-amber-600"
          )}
        >
          {selectedIds.length}/{max}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        {groups.length === 0 && (
          <p className="text-muted-foreground p-4 text-center text-sm">
            Aucun sujet trouvé.
          </p>
        )}
        {groups.map(({ chapter, items }) => (
          <div key={chapter}>
            <div className="bg-muted/60 sticky top-0 px-3 py-1 text-xs font-medium">
              {chapter}
            </div>
            {items.map((topic) => {
              const isSelected = selected.has(topic.id);
              return (
                <Label
                  key={topic.id}
                  className="hover:bg-muted/40 flex cursor-pointer items-center gap-2 px-3 py-1.5 font-normal"
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled || (!isSelected && isFull)}
                    onCheckedChange={(c) => toggle(topic.id, c === true)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {topic.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    p.{topic.pageStart} · {topic._count.questions}/
                    {topic.questionCapacity}
                  </span>
                </Label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
