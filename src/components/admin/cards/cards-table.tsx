"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash, Search } from "lucide-react";
import { useTransition } from "react";

interface ReferencielSimple {
  id: number;
  title: string;
}

interface LearningCardAdmin {
  id: number;
  theme: string;
  niveau: string;
  info: string;
  reference: string;
  referencielId: number | null;
  referenciel?: ReferencielSimple | null;
}

interface CardsTableProps {
  data: LearningCardAdmin[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onEdit: (card: LearningCardAdmin) => void;
  onDelete: (id: number) => void;
}

export function CardsTable({ data, meta, onEdit, onDelete }: CardsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = React.useState(
    searchParams.get("search") || ""
  );

  const updateParams = (page: number, search: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }

    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams(1, searchVal);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center space-x-2"
      >
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            type="search"
            placeholder="Rechercher par thème, info ou référence..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Rechercher
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Thème</TableHead>
              <TableHead className="w-[120px]">Niveau</TableHead>
              <TableHead>Informations</TableHead>
              <TableHead className="w-[150px]">Référence</TableHead>
              <TableHead className="w-[180px]">Référentiel</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-semibold">{card.theme}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                      {card.niveau}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[400px] truncate">
                    {card.info}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.reference}
                  </TableCell>
                  <TableCell>
                    {card.referenciel ? (
                      <span className="text-sm font-medium">
                        {card.referenciel.title}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">
                        Aucun
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(card)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(card.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Aucune carte d'apprentissage trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-muted-foreground flex-1 text-sm">
            Total : {meta.total} carte(s)
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams(meta.page - 1, searchVal)}
              disabled={meta.page <= 1 || isPending}
            >
              Précédent
            </Button>
            <span className="text-sm font-medium">
              Page {meta.page} sur {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateParams(meta.page + 1, searchVal)}
              disabled={meta.page >= meta.totalPages || isPending}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
