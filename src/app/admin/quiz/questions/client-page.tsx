"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QuestionsTable } from "@/components/admin/quiz/questions-table";
import { QuestionDialog } from "@/components/admin/quiz/question-dialog";
import { ArchivedBadge } from "@/components/admin/archived-badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Archive, ArchiveRestore, Plus, Trash, X } from "lucide-react";
import {
  Question,
  bulkDeleteQuestionsAction,
  bulkQuizzesAction,
  deleteQuestionAction,
} from "@/app/actions/quiz-actions";
import type { BulkContentAction } from "@/lib/content-archive";
import {
  QUESTION_SOURCES,
  QUESTION_SOURCE_LABELS,
  type QuestionFilters,
} from "@/lib/question-filters";
import { toast } from "sonner";

interface QuizOption {
  id: number;
  title: string;
  archivedAt: Date | null;
  _count: { questions: number };
}

interface ClientPageProps {
  initialQuestions: Question[];
  total: number;
  filters: QuestionFilters;
  quizzes: QuizOption[];
}

const QUIZ_ACTION_SUCCESS: Record<BulkContentAction, string> = {
  archive: "Quiz archivé",
  restore: "Quiz restauré",
  delete: "Quiz supprimé",
};

export default function QuestionsClientPage({
  initialQuestions,
  total,
  filters,
  quizzes,
}: ClientPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizDeleteOpen, setQuizDeleteOpen] = useState(false);
  const [quizActionPending, setQuizActionPending] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFiltering, startTransition] = useTransition();

  const selectedQuiz = quizzes.find((q) => q.id === filters.quizId);
  const hasFilters =
    filters.source !== "all" ||
    !!filters.quizId ||
    filters.archived !== "all" ||
    filters.incomplete;

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

  const handleEdit = useCallback((question: Question) => {
    setSelectedQuestion(question);
    setDialogOpen(true);
  }, []);

  const handleCreate = () => {
    setSelectedQuestion(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = useCallback((id: number) => {
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (idToDelete) {
      const result = await deleteQuestionAction(idToDelete);
      if (!result.success)
        toast.error(result.error || "Suppression impossible");
      setDeleteDialogOpen(false);
      setIdToDelete(null);
      router.refresh();
    }
  };

  const handleBulkDelete = async (ids: number[]): Promise<boolean> => {
    const result = await bulkDeleteQuestionsAction({ ids });
    if (!result.success) {
      toast.error(result.error || "Impossible de supprimer les questions");
      return false;
    }
    toast.success(
      `${result.count} question(s) supprimée(s)` +
        (result.removedExercises
          ? `, ${result.removedExercises} étape(s) de leçon retirée(s)`
          : "")
    );
    router.refresh();
    return true;
  };

  const runQuizAction = async (action: BulkContentAction) => {
    if (!selectedQuiz) return;
    setQuizActionPending(true);
    try {
      const result = await bulkQuizzesAction({
        ids: [selectedQuiz.id],
        action,
      });
      if (!result.success) {
        toast.error(result.error || "Impossible de traiter le quiz");
        return;
      }
      toast.success(QUIZ_ACTION_SUCCESS[action]);
      if (action === "delete") setParams({ quizId: null });
      else router.refresh();
    } finally {
      setQuizActionPending(false);
      setQuizDeleteOpen(false);
    }
  };

  return (
    <div className="w-full p-8">
      <div className="mb-6 flex items-center justify-between space-y-2">
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

      {/* Filtres serveur */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={filters.source}
          disabled={isFiltering}
          onValueChange={(v) =>
            setParams({ source: v === "all" ? null : v, quizId: null })
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {QUESTION_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.quizId ? String(filters.quizId) : "all"}
          disabled={isFiltering}
          onValueChange={(v) => setParams({ quizId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[340px]">
            <SelectValue placeholder="Quiz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les quiz</SelectItem>
            {quizzes.map((quiz) => (
              <SelectItem key={quiz.id} value={String(quiz.id)}>
                {quiz.title} ({quiz._count.questions})
                {quiz.archivedAt ? " · archivé" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.archived}
          disabled={isFiltering}
          onValueChange={(v) => setParams({ archived: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Quiz actifs et archivés</SelectItem>
            <SelectItem value="active">Quiz actifs</SelectItem>
            <SelectItem value="archived">Quiz archivés</SelectItem>
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
            Sans options de réponse
          </Label>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isFiltering}
            onClick={() =>
              setParams({
                source: null,
                quizId: null,
                archived: null,
                incomplete: null,
              })
            }
          >
            <X className="mr-1 h-4 w-4" /> Réinitialiser
          </Button>
        )}

        <span className="text-muted-foreground ml-auto text-sm">
          {isFiltering
            ? "Chargement..."
            : `${total} question(s)` +
              (total > initialQuestions.length
                ? ` (${initialQuestions.length} affichées)`
                : "")}
        </span>
      </div>

      {/* Actions sur le quiz / la banque entière */}
      {selectedQuiz && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2">
          <span className="text-sm">
            Quiz entier : <strong>{selectedQuiz.title}</strong> (
            {selectedQuiz._count.questions} questions)
          </span>
          {selectedQuiz.archivedAt && <ArchivedBadge />}
          <div className="ml-auto flex gap-2">
            {selectedQuiz.archivedAt ? (
              <Button
                variant="outline"
                size="sm"
                disabled={quizActionPending}
                onClick={() => runQuizAction("restore")}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurer le quiz
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={quizActionPending}
                onClick={() => runQuizAction("archive")}
              >
                <Archive className="mr-2 h-4 w-4" /> Archiver le quiz
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={quizActionPending}
              onClick={() => setQuizDeleteOpen(true)}
            >
              <Trash className="mr-2 h-4 w-4" /> Supprimer le quiz
            </Button>
          </div>
        </div>
      )}

      <QuestionsTable
        data={initialQuestions}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onBulkDelete={handleBulkDelete}
      />

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
              Cette action est irréversible. Les étapes de leçon qui utilisent
              cette question seront aussi retirées des parcours.
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

      <AlertDialog open={quizDeleteOpen} onOpenChange={setQuizDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer « {selectedQuiz?.title} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les{" "}
              {selectedQuiz?._count.questions} questions du quiz, ses sessions
              et les étapes de leçon qui les utilisent seront supprimées.
              Préférez l&apos;archivage pour simplement masquer le quiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={quizActionPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={quizActionPending}
              onClick={(e) => {
                e.preventDefault();
                runQuizAction("delete");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer le quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
