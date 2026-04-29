"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TrainingSession } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowUpDown, Eye } from "lucide-react";
import { DeleteSessionButton } from "./delete-session-button";
import dayjs from "dayjs";
import Link from "next/link";
import { SESSION_STATUS } from "../../types";

export const columns: ColumnDef<TrainingSession>[] = [
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
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      switch (status) {
        case SESSION_STATUS.PLANIFIEE:
          return <Badge variant="secondary">Planifiée</Badge>;
        case SESSION_STATUS.EN_COURS:
          return <Badge className="bg-blue-600">En cours</Badge>;
        case SESSION_STATUS.TERMINEE:
          return <Badge className="bg-green-600">Terminée</Badge>;
        case SESSION_STATUS.ANNULEE:
          return <Badge variant="destructive">Annulée</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    },
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
            <Link href={`/admin/training/sessions/${session.id}?tab=settings`}>
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
