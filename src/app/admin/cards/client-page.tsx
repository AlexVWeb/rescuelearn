"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, BrainCircuit } from "lucide-react";
import { deleteLearningCardAction } from "@/app/actions/learning-card-actions";
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
}

interface ClientPageProps {
  initialCards: LearningCardAdmin[];
  referenciels: ReferencielSimple[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function CardsClientPage({
  initialCards,
  referenciels,
  meta,
}: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LearningCardAdmin | null>(
    null
  );
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const router = useRouter();

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

      <div className="w-full">
        <CardsTable
          data={initialCards}
          meta={meta}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
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
              Cette action est irréversible. Cette carte d'apprentissage sera
              supprimée définitivement.
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
