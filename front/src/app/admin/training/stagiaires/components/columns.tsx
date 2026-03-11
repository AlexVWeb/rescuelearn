"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Trainee } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowUpDown } from "lucide-react";
import { TraineeDialog } from "./trainee-dialog";
import { DeleteTraineeButton } from "./delete-trainee-button";
import dayjs from "dayjs";

export const columns: ColumnDef<Trainee>[] = [
  {
    accessorKey: "lastName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium uppercase">{row.getValue("lastName")}</div>
    ),
  },
  {
    accessorKey: "firstName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Prénom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div>{row.getValue("email") || "-"}</div>,
  },
  {
    accessorKey: "phone",
    header: "Téléphone",
    cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
  },
  {
    accessorKey: "dateOfBirth",
    header: "Date de naissance",
    cell: ({ row }) => {
      const date = row.getValue("dateOfBirth") as Date;
      return date ? dayjs(date).format("DD/MM/YYYY") : "-";
    },
  },
  {
    accessorKey: "address",
    header: "Adresse",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">
        {row.getValue("address") || "-"}
      </div>
    ),
  },
  {
    id: "inscriptionsCount",
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
    id: "actions",
    cell: ({ row }) => {
      const trainee = row.original;

      return (
        <div className="flex items-center justify-end gap-2">
          <TraineeDialog trainee={trainee}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </TraineeDialog>
          <DeleteTraineeButton traineeId={trainee.id} />
        </div>
      );
    },
  },
];
