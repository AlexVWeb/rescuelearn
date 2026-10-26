"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TrainingSession } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowUpDown, Eye } from "lucide-react";
import { DeleteSessionButton } from "./delete-session-button";
import dayjs from "dayjs";
import Link from "next/link";
import { SessionStatusBadge } from "./session-status-badge";
import type { PositiveShare } from "@/lib/evaluation/quality";

export type SessionRow = TrainingSession & {
  satisfaction: PositiveShare | null;
};

function SatisfactionCell({
  satisfaction,
}: {
  satisfaction: PositiveShare | null;
}) {
  if (!satisfaction) return <span className="text-muted-foreground">—</span>;
  const answers = `${satisfaction.count} rép.`;
  if (satisfaction.share === null) {
    // Sous le seuil d'anonymat : seul le nombre de réponses est montré
    return (
      <span
        className="text-muted-foreground"
        title="Résultat affiché à partir de 5 réponses"
      >
        {answers}
      </span>
    );
  }
  return (
    <span className="tabular-nums">
      <span className="font-semibold">
        {Math.round(satisfaction.share * 100)} % satisfaits
      </span>
      <span className="text-muted-foreground"> · {answers}</span>
    </span>
  );
}

export const columns: ColumnDef<SessionRow>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Titre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("type")}</Badge>,
  },
  {
    accessorKey: "location",
    header: "Lieu",
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => (
      <SessionStatusBadge status={row.getValue("status") as string} />
    ),
  },
  {
    id: "dates",
    header: "Dates",
    cell: ({ row }) => {
      const start = row.original.startDate;
      const end = row.original.endDate;
      if (!start) return "-";
      if (!end || dayjs(start).isSame(end, "day")) {
        return dayjs(start).format("DD/MM/YYYY");
      }
      return `${dayjs(start).format("DD/MM")} - ${dayjs(end).format("DD/MM/YYYY")}`;
    },
  },
  {
    id: "inscriptions",
    header: "Inscriptions",
    cell: ({ row }) => {
      const count = row.original._count?.inscriptions || 0;
      const max = row.original.maxTrainees;
      const isFull = count >= max;
      return (
        <div className="flex items-center gap-2">
          <span className={isFull ? "text-destructive font-bold" : ""}>
            {count} / {max}
          </span>
          {isFull && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              Complet
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "satisfaction",
    // Tri : sessions avec un résultat d'abord, puis celles sous le seuil
    accessorFn: (row) => row.satisfaction?.share ?? -1,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Satisfaction
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <SatisfactionCell satisfaction={row.original.satisfaction} />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const session = row.original;

      return (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/admin/training/sessions/${session.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/admin/training/sessions/${session.id}?edit=1`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <DeleteSessionButton
            sessionId={session.id}
            sessionTitle={session.title}
          />
        </div>
      );
    },
  },
];

/** Colonnes sans satisfaction : module évaluation inactif pour l'organisme. */
export const columnsWithoutSatisfaction = columns.filter(
  (column) => column.id !== "satisfaction"
);
