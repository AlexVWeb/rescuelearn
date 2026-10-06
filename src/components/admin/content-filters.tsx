"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ArchiveFilter } from "@/lib/content-archive";

interface ContentFiltersProps {
  archived: ArchiveFilter;
  referencielId?: number;
  referenciels: { id: number; title: string }[];
}

/** Filtres d'URL partagés par les tableaux admin de quiz et de cartes. */
export function ContentFilters({
  archived,
  referencielId,
  referenciels,
}: ContentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={archived}
        disabled={isPending}
        onValueChange={(v) => setParam("archived", v === "active" ? null : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Actifs</SelectItem>
          <SelectItem value="archived">Archivés</SelectItem>
          <SelectItem value="all">Tous</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={referencielId ? String(referencielId) : "all"}
        disabled={isPending}
        onValueChange={(v) => setParam("referencielId", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Référentiel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les référentiels</SelectItem>
          {referenciels.map((ref) => (
            <SelectItem key={ref.id} value={String(ref.id)}>
              {ref.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
