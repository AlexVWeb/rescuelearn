"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { importQuizAction } from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileJson, Info } from "lucide-react";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_EXAMPLE = {
  title: "Titre du Quiz",
  timePerQuestion: 30,
  passingScore: 70,
  modeRandom: false,
  level: "Niveau 1",
  questions: [
    {
      question: "Question exemple ?",
      options: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
      correctAnswer: 1, // Index 0-3 (1 = B)
      explanation: "Explication optionnelle.",
      tags: ["Secourisme", "Exemple"],
    },
  ],
};

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  tags?: string[];
}

interface QuizImportData {
  title: string;
  questions: QuizQuestion[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: unknown;
}

export function ImportDialog({
  open,
  onOpenChange,
  initialData,
}: ImportDialogProps) {
  const router = useRouter();
  const [jsonContent, setJsonContent] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        const content = JSON.stringify(initialData, null, 2);
        setJsonContent(content);
        validateJSON(content);
      } else {
        const content = JSON.stringify(DEFAULT_EXAMPLE, null, 2);
        setJsonContent(content);
        setIsValid(false);
        setError(null);
      }
    } else {
      setJsonContent("");
      setIsValid(false);
      setError(null);
    }
  }, [open, initialData]);

  const validateJSON = (content: string) => {
    try {
      if (!content.trim()) {
        setIsValid(false);
        setError("Le JSON ne peut pas être vide.");
        return false;
      }

      const parsed = JSON.parse(content) as QuizImportData;

      // Basic Schema Check
      if (!parsed.title) throw new Error("Propriété 'title' manquante.");
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0)
        throw new Error("Tableau 'questions' manquant ou vide.");

      parsed.questions.forEach((q: QuizQuestion, i: number) => {
        if (!q.question)
          throw new Error(`Question ${i + 1}: 'question' manquante.`);
        if (!Array.isArray(q.options) || q.options.length < 2)
          throw new Error(`Question ${i + 1}: Il faut au moins 2 'options'.`);
        if (typeof q.correctAnswer !== "number")
          throw new Error(
            `Question ${i + 1}: 'correctAnswer' doit être un index numérique.`
          );
      });

      setIsValid(true);
      setError(null);
      return true;
    } catch (e: unknown) {
      setIsValid(false);
      setError(e instanceof Error ? e.message : "JSON invalide.");
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonContent(val);
    validateJSON(val);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      setJsonContent(JSON.stringify(parsed, null, 2));
      validateJSON(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignore format error if invalid JSON
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsLoading(true);
    try {
      const parsed = JSON.parse(jsonContent);
      const res = await importQuizAction(parsed);
      if (res.success) {
        onOpenChange(false);
        router.refresh();
        setJsonContent("");
      } else {
        setError(res.error || "Erreur lors de l'import.");
        setIsValid(false);
      }
    } catch (e) {
      logger.error("Import error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" /> Import JSON
          </DialogTitle>
          <DialogDescription>
            Collez le JSON du quiz ci-dessous. Le format sera validé
            automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          <div className="relative">
            <Textarea
              value={jsonContent}
              onChange={handleChange}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Collez votre JSON ici..."
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 h-7 text-xs"
              onClick={handleFormat}
            >
              Formater
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isValid && !error && (
            <Alert className="border-green-200 bg-green-50 text-green-600">
              <CheckCircle2 className="h-4 w-4 stroke-green-600" />
              <AlertTitle>Valide</AlertTitle>
              <AlertDescription>
                Le format JSON est correct. Prêt à importer.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-muted-foreground text-xs">
              Structure :{" "}
              {`{ title, timePerQuestion, passingScore, modeRandom, level, questions: [{ question, options: [], correctAnswer (index), explanation, tags: [] }] }`}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? "Importation..." : "Importer le Quiz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
