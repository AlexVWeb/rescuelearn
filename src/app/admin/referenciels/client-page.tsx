"use client";

import { useState } from "react";
import { ReferencielsTable } from "@/components/admin/referenciels-table";
import { ReferencielDialog } from "@/components/admin/referenciel-dialog";
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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Referenciel,
  deleteReferencielAction,
} from "@/app/actions/referenciel-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startReferencielAnalysisAction } from "@/app/actions/referenciel-topic-actions";
import { ReferencielContentDialog } from "@/components/admin/referenciel-content-dialog";

interface ClientPageProps {
  initialReferenciels: Referenciel[];
}

export default function ClientPage({ initialReferenciels }: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReferenciel, setSelectedReferenciel] =
    useState<Referenciel | null>(null);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [contentReferenciel, setContentReferenciel] =
    useState<Referenciel | null>(null);
  const router = useRouter();

  const referenciels = initialReferenciels;

  const handleEdit = (ref: Referenciel) => {
    setSelectedReferenciel(ref);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedReferenciel(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleAnalyze = async (id: number) => {
    const result = await startReferencielAnalysisAction(id);
    if (result.success) {
      toast.success("Analyse lancée");
    } else {
      toast.error(result.error ?? "Impossible de lancer l'analyse");
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      await deleteReferencielAction(idToDelete);
      setDeleteDialogOpen(false);
      setIdToDelete(null);
      router.refresh();
    }
  };

  return (
    <div className="w-full p-8">
      <div className="mb-8 flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Référentiels</h2>
          <p className="text-muted-foreground">
            Gestion des documents de référence (PDF) et de leurs versions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="w-full">
        <ReferencielsTable
          data={referenciels}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onAnalyze={handleAnalyze}
          onManageContent={setContentReferenciel}
        />
      </div>

      <ReferencielDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        referenciel={selectedReferenciel}
      />

      <ReferencielContentDialog
        referenciel={contentReferenciel}
        onOpenChange={(open) => !open && setContentReferenciel(null)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le référentiel sera supprimé
              définitivement. (Le fichier PDF associé ne sera pas supprimé
              automatiquement du disque pour l'instant).
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
