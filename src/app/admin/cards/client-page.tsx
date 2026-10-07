"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BrainCircuit, X } from "lucide-react";
import {
  bulkLearningCardsAction,
  deleteLearningCardAction,
  getAdminLearningCardIdsAction,
} from "@/app/actions/learning-card-actions";
import { ContentFilters } from "@/components/admin/content-filters";
import type { BulkContentAction } from "@/lib/content-archive";
import {
  CARD_USAGES,
  CARD_USAGE_LABELS,
  type CardFilters,
} from "@/lib/card-filters";
import { CardsTable } from "@/components/admin/cards/cards-table";
import { CardDialog } from "@/components/admin/cards/card-dialog";
import { AiGenerateCardDialog } from "@/components/admin/cards/ai-generate-card-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface ReferencielSimple {
  id: number;
  title: string;
}

export interface LearningCardAdmin {
  id: number;
  theme: string;
  niveau: string;
  info: string;
  reference: string;
  referencielId: number | null;
  referenciel?: ReferencielSimple | null;
  archivedAt: Date | null;
  _count?: { progressionExercises: number };
}

const BULK_SUCCESS: Record<BulkContentAction, string> = {
  archive: "archivée(s)",
  restore: "restaurée(s)",
  delete: "supprimée(s)",
};

interface ClientPageProps {
  initialCards: LearningCardAdmin[];
  referenciels: ReferencielSimple[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  niveaux: string[];
  search: string;
  filters: CardFilters;
}

export default function CardsClientPage({
  initialCards,
  referenciels,
  niveaux,
  meta,
  search,
  filters,
}: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LearningCardAdmin | null>(
    null
  );
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFiltering, startTransition] = useTransition();

  const hasExtraFilters =
    !!filters.niveau || filters.usage !== "all" || filters.incomplete;

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const fetchAllFilteredIds = async (): Promise<number[]> => {
    const result = await getAdminLearningCardIdsAction(search, filters);
    if (!result.success || !result.data) {
      toast.error(result.error || "Impossible de sélectionner les cartes");
      return [];
    }
    return result.data;
  };

  const handleEdit = (card: LearningCardAdmin) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCard(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      try {
        const result = await deleteLearningCardAction(idToDelete);
        if (result.success) {
          toast.success("Carte supprimée avec succès");
        } else {
          toast.error(result.error || "Impossible de supprimer la carte");
        }
      } catch {
        toast.error("Une erreur est survenue lors de la suppression");
      } finally {
        setDeleteDialogOpen(false);
        setIdToDelete(null);
        router.refresh();
      }
    }
  };

  const handleBulkAction = async (
    ids: number[],
    action: BulkContentAction
  ): Promise<boolean> => {
    const result = await bulkLearningCardsAction({ ids, action });
    if (!result.success) {
      toast.error(result.error || "Impossible de traiter les cartes");
      return false;
    }
    toast.success(`${result.count} carte(s) ${BULK_SUCCESS[action]}`);
    router.refresh();
    return true;
  };

  return (
    <div className="w-full p-8">
      <div className="mb-8 flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cartes d'apprentissage
          </h2>
          <p className="text-muted-foreground">
            Gestion et génération de fiches pédagogiques de révision.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAiGenerateDialogOpen(true)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <BrainCircuit className="mr-2 h-4 w-4" /> Générer avec IA
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Carte
          </Button>
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <ContentFilters
            archived={filters.archived}
            referencielId={filters.referencielId}
            referenciels={referenciels}
          />
          <Select
            value={filters.niveau ?? "all"}
            disabled={isFiltering}
            onValueChange={(v) => setParams({ niveau: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              {niveaux.map((niveau) => (
                <SelectItem key={niveau} value={niveau}>
                  {niveau}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.usage}
            disabled={isFiltering}
            onValueChange={(v) => setParams({ usage: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_USAGES.map((usage) => (
                <SelectItem key={usage} value={usage}>
                  {CARD_USAGE_LABELS[usage]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox
              id="incomplete"
              checked={filters.incomplete}
              disabled={isFiltering}
              onCheckedChange={(v) => setParams({ incomplete: v ? "1" : null })}
            />
            <Label htmlFor="incomplete" className="text-sm">
              Sans contenu
            </Label>
          </div>
          {hasExtraFilters && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isFiltering}
              onClick={() =>
                setParams({ niveau: null, usage: null, incomplete: null })
              }
            >
              <X className="mr-1 h-4 w-4" /> Réinitialiser
            </Button>
          )}
          <span className="text-muted-foreground ml-auto text-sm">
            {isFiltering ? "Chargement..." : `${meta.total} carte(s)`}
          </span>
        </div>
        <CardsTable
          data={initialCards}
          meta={meta}
          onSelectAllFiltered={fetchAllFilteredIds}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onBulkAction={handleBulkAction}
        />
      </div>

      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        card={selectedCard}
        referenciels={referenciels}
      />

      <AiGenerateCardDialog
        open={aiGenerateDialogOpen}
        onOpenChange={setAiGenerateDialogOpen}
        referenciels={referenciels}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cette carte d&apos;apprentissage
              sera supprimée définitivement, ainsi que les étapes de leçon qui
              l&apos;utilisent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
