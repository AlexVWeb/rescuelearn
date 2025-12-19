"use client";

import { useState } from "react";
import { QuestionsTable } from "@/components/admin/quiz/questions-table";
import { QuestionDialog } from "@/components/admin/quiz/question-dialog";
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
import { Question, deleteQuestionAction } from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";

interface ClientPageProps {
    initialQuestions: Question[];
}

export default function QuestionsClientPage({ initialQuestions }: ClientPageProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const router = useRouter();

    const handleEdit = (question: Question) => {
        setSelectedQuestion(question);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedQuestion(null);
        setDialogOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setIdToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (idToDelete) {
            await deleteQuestionAction(idToDelete);
            setDeleteDialogOpen(false);
            setIdToDelete(null);
            router.refresh();
        }
    };

    return (
        <div className="w-full p-8">
            <div className="flex items-center justify-between space-y-2 mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
                    <p className="text-muted-foreground">
                        Gestion des questions associées aux quiz.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une question
                    </Button>
                </div>
            </div>

            <div className="w-full">
                <QuestionsTable
                    data={initialQuestions}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                />
            </div>

            <QuestionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                question={selectedQuestion}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible.
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
