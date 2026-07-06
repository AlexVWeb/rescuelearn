"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrganismesTable } from "@/components/admin/organismes-table";
import { Organisme } from "@/types/organisme";
import { deleteOrganismeAction } from "@/app/actions/organisme.actions";
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

interface ClientPageProps {
  initialOrganismes: Organisme[];
}

export default function ClientPage({ initialOrganismes }: ClientPageProps) {
  const router = useRouter();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [organismeToDelete, setOrganismeToDelete] = useState<string | null>(
    null
  );

  const handleDeleteClick = (id: string) => {
    setOrganismeToDelete(id);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!organismeToDelete) return;

    try {
      const result = await deleteOrganismeAction(organismeToDelete);
      if (result.success) {
        toast.success("Organisme supprimé");
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setOrganismeToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Organismes
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez les organismes de formation de la plateforme.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/organismes/new">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un organisme
          </Link>
        </Button>
      </div>

      <OrganismesTable data={initialOrganismes} onDelete={handleDeleteClick} />

      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement
              l&apos;organisme et toutes les données associées (sessions,
              stagiaires, etc.).
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
