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
import { Referenciel, deleteReferencielAction } from "@/app/actions/referenciel-actions";
import { useRouter } from "next/navigation";

interface ClientPageProps {
    initialReferenciels: any[];
}

export default function ClientPage({ initialReferenciels }: ClientPageProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedReferenciel, setSelectedReferenciel] = useState<Referenciel | null>(null);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const router = useRouter();

    const referenciels = initialReferenciels as Referenciel[];

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
            <div className="flex items-center justify-between space-y-2 mb-8">
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
                />
            </div>

            <ReferencielDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                referenciel={selectedReferenciel}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le référentiel sera supprimé définitivement.
                            (Le fichier PDF associé ne sera pas supprimé automatiquement du disque pour l'instant).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
