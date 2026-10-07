"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, ChevronDown, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { ArchivedBadge } from "@/components/admin/archived-badge";
import { BulkActionsBar } from "@/components/admin/bulk-actions-bar";
import { Question } from "@/app/actions/quiz-actions";

export const columns = (
  onEdit: (question: Question) => void,
  onDelete: (id: number) => void
): ColumnDef<Question>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Sélectionner la page"
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
    id: "quiz",
    accessorFn: (row) => row.quiz?.title ?? "",
    header: "Quiz",
    meta: { label: "Quiz" },
    cell: ({ row }) => (
      <div className="flex max-w-[200px] flex-col items-start gap-1">
        <span className="text-muted-foreground text-xs font-medium uppercase">
          {row.original.quiz?.title || "Sans quiz"}
        </span>
        <div className="flex gap-1">
          {row.original.quiz?.archivedAt && <ArchivedBadge />}
          {row.original.quiz?.generatedByAi && (
            <Badge variant="outline" className="text-[10px]">
              IA
            </Badge>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "text",
    header: "Question",
    meta: { label: "Question" },
    cell: ({ row }) => (
      <div className="line-clamp-2 max-w-[480px] min-w-[240px] whitespace-normal">
        {row.getValue("text")}
      </div>
    ),
  },
  {
    id: "options",
    accessorFn: (row) => row.options.length,
    header: "Options",
    meta: { label: "Options" },
    cell: ({ row }) => {
      const count = row.original.options.length;
      return count === 0 ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> Aucune
        </span>
      ) : (
        <span className="text-sm">{count}</span>
      );
    },
  },
  {
    accessorKey: "correctAnswer",
    header: "Réponse",
    meta: { label: "Réponse" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="border-green-200 bg-green-100 text-green-800"
      >
        {row.getValue("correctAnswer")}
      </Badge>
    ),
  },
  {
    id: "lessons",
    accessorFn: (row) => row._count?.progressionExercises ?? 0,
    header: "Leçons",
    meta: { label: "Leçons" },
    cell: ({ getValue }) => {
      const count = getValue<number>();
      return count > 0 ? (
        <Badge variant="secondary">{count}</Badge>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const question = row.original;

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
            <DropdownMenuItem onClick={() => onEdit(question)}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(question.id)}
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

interface QuestionsTableProps {
  data: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: number) => void;
  onBulkDelete: (ids: number[]) => Promise<boolean>;
}

export function QuestionsTable({
  data,
  onEdit,
  onDelete,
  onBulkDelete,
}: QuestionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Les filtres serveur remplacent les données : la sélection n'a plus de sens
  const [syncedData, setSyncedData] = React.useState(data);
  if (syncedData !== data) {
    setSyncedData(data);
    setRowSelection({});
  }

  const tableColumns = React.useMemo(
    () => columns(onEdit, onDelete),
    [onEdit, onDelete]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: (question) => String(question.id),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: { pagination: { pageSize: 20 } },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id);
  const filteredCount = table.getFilteredRowModel().rows.length;
  const allFilteredSelected =
    filteredCount > 0 &&
    table.getFilteredSelectedRowModel().rows.length === filteredCount;

  const handleBulkAction = async () => {
    if (await onBulkDelete(selectedIds)) setRowSelection({});
  };

  const selectAllFiltered = () => {
    setRowSelection(
      Object.fromEntries(
        table.getFilteredRowModel().rows.map((row) => [row.id, true] as const)
      )
    );
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filtrer par question..."
          value={(table.getColumn("text")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("text")?.setFilterValue(event.target.value)
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
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value: boolean) =>
                    column.toggleVisibility(!!value)
                  }
                >
                  {column.columnDef.meta?.label ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <BulkActionsBar
        count={selectedIds.length}
        itemLabel="question(s)"
        actions={["delete"]}
        deleteWarning="Les étapes de leçon qui utilisent ces questions seront aussi retirées des parcours."
        onAction={handleBulkAction}
        onClear={() => setRowSelection({})}
      />
      {table.getIsAllPageRowsSelected() && !allFilteredSelected && (
        <p className="text-muted-foreground text-sm">
          Les {table.getRowModel().rows.length} questions de la page sont
          sélectionnées.{" "}
          <button
            type="button"
            onClick={selectAllFiltered}
            className="font-semibold text-blue-600 hover:underline"
          >
            Sélectionner les {filteredCount} questions filtrées
          </button>
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
                  colSpan={tableColumns.length}
                  className="h-24 text-center"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="text-muted-foreground flex-1 text-sm">
          {selectedIds.length} sur {filteredCount} ligne(s) sélectionnée(s).
        </div>
        <span className="text-muted-foreground text-sm">
          Page {table.getState().pagination.pageIndex + 1} /{" "}
          {Math.max(table.getPageCount(), 1)}
        </span>
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
  );
}
