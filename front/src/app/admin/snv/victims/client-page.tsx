"use client";

import { useState } from "react";
import { SNVVictimsTable } from "@/components/admin/snv/victims-table";
import { SNVVictimDialog } from "@/components/admin/snv/victim-dialog";
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
import { SNVVictim, deleteVictimAction } from "@/app/actions/snv-actions";
import { useRouter } from "next/navigation";

interface ClientPageProps {
    initialVictims: SNVVictim[];
}

export default function VictimsClientPage({ initialVictims }: ClientPageProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedVictim, setSelectedVictim] = useState<SNVVictim | null>(null);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const router = useRouter();

    const handleEdit = (victim: SNVVictim) => {
        setSelectedVictim(victim);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedVictim(null);
        setDialogOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setIdToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (idToDelete) {
            await deleteVictimAction(idToDelete);
            setDeleteDialogOpen(false);
            setIdToDelete(null);
            router.refresh();
        }
    };

    return (
        <div className="w-full p-8">
            <div className="flex items-center justify-between space-y-2 mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Victimes SNV</h2>
                    <p className="text-muted-foreground">
                        Gestion des victimes associées aux scénarios SNV.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une victime
                    </Button>
                </div>
            </div>

            <div className="w-full">
                <SNVVictimsTable
                    data={initialVictims}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />
            </div>

            <SNVVictimDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                victim={selectedVictim}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. La victime sera supprimée définitivement.
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
