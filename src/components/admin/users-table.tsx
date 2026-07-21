"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/app/actions/user-actions";
import { UserRole } from "@/lib/roles";

interface UsersTableProps {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onDelete: (id: string) => void;
  onEdit: (user: User) => void;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_ORGANISME: "Admin Organisme",
  FORMATEUR: "Formateur",
  PLAYER: "Apprenant",
};

export function UsersTable({ data, meta, onDelete, onEdit }: UsersTableProps) {
  "use no memo";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Local state for search to avoid queries on every keystroke
  const [searchVal, setSearchVal] = React.useState(
    searchParams.get("search") || ""
  );

  const currentRole = searchParams.get("role") || "all";
  const currentStatus = searchParams.get("status") || "all";
  const currentSortBy = searchParams.get("sortBy") || "createdAt";
  const currentSortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Default to page 1 on filter/search change unless explicitly overriding page
    if (!("page" in updates)) {
      params.delete("page");
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchVal });
  };

  const handleSort = (field: string) => {
    let order: "asc" | "desc" = "asc";
    if (currentSortBy === field && currentSortOrder === "asc") {
      order = "desc";
    }
    updateParams({ sortBy: field, sortOrder: order });
  };

  const columns: ColumnDef<User>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "name",
      header: () => {
        return (
          <Button
            variant="ghost"
            onClick={() => handleSort("name")}
            className="-ml-3 flex h-8 items-center gap-1 font-semibold"
          >
            <span>Nom / Email</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image || ""} alt={user.name || ""} />
              <AvatarFallback>
                {user.name?.slice(0, 2).toUpperCase() || "CN"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {user.name || "Sans nom"}
              </span>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "roles",
      header: "Rôles",
      cell: ({ row }) => {
        const roles = row.getValue("roles") as UserRole[];
        const displayRoles = Array.isArray(roles)
          ? roles.map((r) => ROLE_LABELS[r] || r).join(", ")
          : "Aucun";

        return (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs font-normal">
              {displayRoles}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "emailVerified",
      header: "Statut",
      cell: ({ row }) => {
        const isVerified = row.getValue("emailVerified") as boolean;
        return (
          <Badge
            variant={isVerified ? "outline" : "destructive"}
            className="font-normal capitalize"
          >
            {isVerified ? "Vérifié" : "Non vérifié"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: () => {
        return (
          <Button
            variant="ghost"
            onClick={() => handleSort("createdAt")}
            className="-ml-3 flex h-8 items-center gap-1 font-semibold"
          >
            <span>Date d'inscription</span>
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span className="text-sm">{date.toLocaleDateString("fr-FR")}</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
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
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.id)}
              >
                Copier l'ID utilisateur
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(user)}>
                Modifier les détails
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(user.id)}
                className="text-destructive focus:text-destructive"
              >
                Supprimer l'utilisateur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <div className="space-y-4">
      {/* Barre d'outils et de filtrage */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form
          onSubmit={handleSearchSubmit}
          className="flex max-w-sm flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Rechercher par nom, email..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Rechercher
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre par Rôle */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
              <SlidersHorizontal className="h-3 w-3" /> Rôle:
            </span>
            <Select
              value={currentRole}
              onValueChange={(val) => updateParams({ role: val })}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN_ORGANISME">Admin Organisme</SelectItem>
                <SelectItem value="FORMATEUR">Formateur</SelectItem>
                <SelectItem value="PLAYER">Apprenant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par Statut */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Statut:
            </span>
            <Select
              value={currentStatus}
              onValueChange={(val) => updateParams({ status: val })}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="verified">Vérifié</SelectItem>
                <SelectItem value="unverified">Non vérifié</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="relative rounded-md border">
        {isPending && (
          <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2"></div>
          </div>
        )}
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Contrôles de pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-muted-foreground flex-1 text-sm">
          Total : {meta.total} utilisateur(s)
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Lignes par page</p>
            <Select
              value={`${meta.limit}`}
              onValueChange={(value) => {
                updateParams({ limit: value, page: "1" });
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={meta.limit} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {meta.page} sur {meta.totalPages || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => updateParams({ page: "1" })}
              disabled={meta.page <= 1}
            >
              <span className="sr-only">Première page</span>
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updateParams({ page: (meta.page - 1).toString() })}
              disabled={meta.page <= 1}
            >
              <span className="sr-only">Page précédente</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updateParams({ page: (meta.page + 1).toString() })}
              disabled={meta.page >= meta.totalPages}
            >
              <span className="sr-only">Page suivante</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => updateParams({ page: meta.totalPages.toString() })}
              disabled={meta.page >= meta.totalPages}
            >
              <span className="sr-only">Dernière page</span>
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
