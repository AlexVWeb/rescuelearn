"use client";

import { useState } from "react";
import { QuizzesTable } from "@/components/admin/quiz/quizzes-table";
import { QuizDialog } from "@/components/admin/quiz/quiz-dialog";
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
import { Quiz, deleteQuizAction } from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";

import { ImportDialog } from "@/components/admin/quiz/import-dialog";
import { AiGenerateDialog } from "@/components/admin/quiz/ai-generate-dialog";
import { BrainCircuit } from "lucide-react";

import { toast } from "sonner";

interface ClientPageProps {
  initialQuizzes: Quiz[];
}

export default function QuizClientPage({ initialQuizzes }: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [generatedData, setGeneratedData] = useState<unknown>(null);
  const router = useRouter();

  const handleEdit = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedQuiz(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      try {
        const result = await deleteQuizAction(idToDelete);
        if (result.success) {
          toast.success("Quiz supprimé avec succès");
        } else {
          toast.error(result.error || "Impossible de supprimer le quiz");
        }
      } catch (err) {
        toast.error("Une erreur est survenue lors de la suppression");
      } finally {
        setDeleteDialogOpen(false);
        setIdToDelete(null);
        router.refresh();
      }
    }
  };

  const handleGenerationSuccess = (data: unknown) => {
    setGeneratedData(data);
    setImportDialogOpen(true);
  };

  const handleImportDialogChange = (open: boolean) => {
    setImportDialogOpen(open);
    if (!open) {
      setGeneratedData(null);
    }
  };

  return (
    <div className="w-full p-8">
      <div className="mb-8 flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quiz</h2>
          <p className="text-muted-foreground">
            Gestion des quiz et de leurs paramètres.
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
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Importer
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau Quiz
          </Button>
        </div>
      </div>

      <div className="w-full">
        <QuizzesTable
          data={initialQuizzes}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <QuizDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quiz={selectedQuiz}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={handleImportDialogChange}
        initialData={generatedData}
      />

      <AiGenerateDialog
        open={aiGenerateDialogOpen}
        onOpenChange={setAiGenerateDialogOpen}
        onGenerationSuccess={handleGenerationSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les questions associées à ce
              quiz seront également supprimées.
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
