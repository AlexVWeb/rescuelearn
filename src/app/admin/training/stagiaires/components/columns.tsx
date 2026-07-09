"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
import { TraineeListItem } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { DeleteTraineeButton } from "./delete-trainee-button";
import dayjs from "dayjs";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
  }
}

export const columns: ColumnDef<TraineeListItem>[] = [
  {
    accessorKey: "lastName",
    meta: { label: "Nom" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nom
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium uppercase">{row.getValue("lastName")}</div>
    ),
  },
  {
    accessorKey: "firstName",
    meta: { label: "Prénom" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Prénom
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "email",
    meta: { label: "Email" },
    header: "Email",
    cell: ({ row }) => <div>{row.getValue("email") || "-"}</div>,
  },
  {
    accessorKey: "phone",
    meta: { label: "Téléphone" },
    header: "Téléphone",
    cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
  },
  {
    accessorKey: "dateOfBirth",
    meta: { label: "Date de naissance" },
    header: "Date de naissance",
    cell: ({ row }) => {
      const date = row.getValue("dateOfBirth") as Date;
      return date ? dayjs(date).format("DD/MM/YYYY") : "-";
    },
  },
  {
    accessorKey: "address",
    meta: { label: "Adresse" },
    header: "Adresse",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">
        {row.getValue("address") || "-"}
      </div>
    ),
  },
  {
    id: "inscriptionsCount",
    meta: { label: "Formations" },
    header: "Formations",
    cell: ({ row }) => {
      const count = row.original._count?.inscriptions || 0;
      return (
        <Badge variant="secondary">
          {count} formation{count > 1 ? "s" : ""}
        </Badge>
      );
    },
  },
  {
    id: "competences",
    meta: { label: "Compétences" },
    header: "Compétences",
    cell: ({ row }) => {
      const competences = row.original.validCompetences;
      if (!competences || competences.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {competences.map((type) => (
            <Badge key={type} variant="default" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "nextExpiry",
    meta: { label: "Fin de validité" },
    header: "Fin de validité",
    cell: ({ row }) => {
      const { nextExpiry, nextExpiryType } = row.original;
      if (!nextExpiry || !nextExpiryType) {
        return <span className="text-muted-foreground">—</span>;
      }
      const expiry = dayjs(nextExpiry);
      const now = dayjs();
      const daysUntil = expiry.diff(now, "day");

      const variant =
        daysUntil <= 30
          ? "destructive"
          : daysUntil <= 90
            ? "secondary"
            : "default";

      return (
        <Badge variant={variant} className="whitespace-nowrap">
          {nextExpiryType} — {expiry.format("DD/MM/YYYY")}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const trainee = row.original;
      return (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/training/stagiaires/${trainee.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <DeleteTraineeButton traineeId={trainee.id} />
        </div>
      );
    },
  },
];
