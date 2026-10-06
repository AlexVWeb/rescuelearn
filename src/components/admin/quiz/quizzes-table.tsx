"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArchivedBadge } from "@/components/admin/archived-badge";
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar";
import type { BulkContentAction } from "@/lib/content-archive";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Quiz } from "@/app/actions/quiz-actions";

export const columns = (
  onEdit: (quiz: Quiz) => void,
  onDelete: (id: number) => void
): ColumnDef<Quiz>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Tout sélectionner"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Sélectionner la ligne"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    id: "referenciel",
    accessorFn: (quiz) => quiz.referenciel?.title ?? "",
    header: "Référentiel",
    cell: ({ row }) =>
      row.original.referenciel ? (
        <span className="text-sm">{row.original.referenciel.title}</span>
      ) : (
        <span className="text-muted-foreground text-xs italic">Aucun</span>
      ),
  },
  {
    accessorKey: "timePerQuestion",
    header: "Temps/Q (sec)",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("timePerQuestion")}</div>
    ),
  },
  {
    accessorKey: "passingScore",
    header: "Score (%)",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("passingScore")}%</div>
    ),
  },
  {
    accessorKey: "modeRandom",
    header: "Aléatoire",
    cell: ({ row }) => {
      const isRandom = row.getValue("modeRandom") as boolean;
      return (
        <div className="flex justify-center">
          {isRandom ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "_count.questions",
    header: "Questions",
    cell: ({ row }) => {
      const count = row.original._count?.questions || 0;
      return <div className="text-center">{count}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div className="flex justify-center gap-1">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
              status === "PUBLISHED"
                ? "bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset"
                : "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-600/20 ring-inset"
            }`}
          >
            {status === "PUBLISHED" ? "Publié" : "Brouillon"}
          </span>
          {row.original.archivedAt && <ArchivedBadge />}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const quiz = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(quiz)}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(quiz.id)}
              className="text-destructive"
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface QuizzesTableProps {
  data: Quiz[];
  onEdit: (quiz: Quiz) => void;
  onDelete: (id: number) => void;
  onBulkAction: (ids: number[], action: BulkContentAction) => Promise<boolean>;
}

export function QuizzesTable({
  data,
  onEdit,
  onDelete,
  onBulkAction,
}: QuizzesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns: columns(onEdit, onDelete),
    getRowId: (quiz) => String(quiz.id),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Les filtres serveur remplacent les données : la sélection n'a plus de sens
  React.useEffect(() => {
    setRowSelection({});
  }, [data]);

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id);

  const handleBulkAction = async (action: BulkContentAction) => {
    if (await onBulkAction(selectedIds, action)) setRowSelection({});
  };

  return (
    <div className="w-full">
      <BulkActionsBar
        count={selectedIds.length}
        itemLabel="quiz"
        deleteWarning="Toutes les questions et sessions associées seront également supprimées."
        onAction={handleBulkAction}
        onClear={() => setRowSelection({})}
      />
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrer par titre..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Colonnes <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value: boolean) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns(onEdit, onDelete).length}
                  className="h-24 text-center"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} sur{" "}
          {table.getFilteredRowModel().rows.length} ligne(s) sélectionnée(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
