"use client";

import { useState } from "react";
import { SNVScenariosTable } from "@/components/admin/snv/scenarios-table";
import { SNVScenarioDialog } from "@/components/admin/snv/scenario-dialog";
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
import { SNVScenario, deleteScenarioAction } from "@/app/actions/snv-actions";
import { useRouter } from "next/navigation";

interface ClientPageProps {
  initialScenarios: SNVScenario[];
}

export default function ScenariosClientPage({
  initialScenarios,
}: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SNVScenario | null>(
    null
  );
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const router = useRouter();

  const handleEdit = (scenario: SNVScenario) => {
    setSelectedScenario(scenario);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedScenario(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      await deleteScenarioAction(idToDelete);
      setDeleteDialogOpen(false);
      setIdToDelete(null);
      router.refresh();
    }
  };

  return (
    <div className="w-full p-8">
      <div className="mb-8 flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scénarios SNV</h2>
          <p className="text-muted-foreground">
            Gestion des scénarios de Situations à Nombreuses Victimes.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Scénario
          </Button>
        </div>
      </div>

      <div className="w-full">
        <SNVScenariosTable
          data={initialScenarios}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <SNVScenarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scenario={selectedScenario}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les victimes associées à ce
              scénario seront également supprimées.
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
