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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllReferencielsSimpleAction } from "@/app/actions/quiz-actions";
import { generateQuizWithAiAction } from "@/app/actions/ai-quiz-actions";
import { AlertCircle, BrainCircuit, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReferencielSimple {
  id: number;
  title: string;
}

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerationSuccess: (data: unknown) => void;
}

export function AiGenerateDialog({
  open,
  onOpenChange,
  onGenerationSuccess,
}: AiGenerateDialogProps) {
  const [referenciels, setReferenciels] = useState<ReferencielSimple[]>([]);
  const [selectedReferenciel, setSelectedReferenciel] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [level, setLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const fetchReferenciels = async () => {
        try {
          const res = await getAllReferencielsSimpleAction();
          setReferenciels(res);
          if (res.length > 0) {
            setSelectedReferenciel(res[0].id.toString());
          }
        } catch {
          setError("Impossible de charger la liste des référentiels.");
        }
      };
      fetchReferenciels();
    } else {
      setTopic("");
      setLevel("");
      setQuestionCount("10");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferenciel) {
      setError("Veuillez sélectionner un référentiel.");
      return;
    }
    if (!topic.trim()) {
      setError("Veuillez saisir un sujet.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await generateQuizWithAiAction({
        referencielId: parseInt(selectedReferenciel, 10),
        topic,
        questionCount: parseInt(questionCount, 10),
        level: level.trim() || undefined,
      });

      if (res.success && res.data) {
        onGenerationSuccess({
          ...res.data,
          referencielId: parseInt(selectedReferenciel, 10),
          generatedByAi: true,
          status: "DRAFT",
          aiPrompt: topic,
          aiModel: "gemini-2.5-pro",
        });
        onOpenChange(false);
      } else {
        setError(res.error || "Une erreur est survenue lors de la génération.");
      }
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 animate-pulse text-blue-600" />
              Générer avec l'IA Gemini
            </DialogTitle>
            <DialogDescription>
              Configurez le sujet et laissez l'intelligence artificielle
              analyser le PDF du référentiel pour créer un quiz adapté.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="referenciel">Référentiel source</Label>
              {referenciels.length === 0 ? (
                <div className="text-muted-foreground bg-muted/30 rounded border p-2 text-sm">
                  Aucun référentiel PDF disponible. Veuillez en uploader un dans
                  l'onglet Référentiels d'abord.
                </div>
              ) : (
                <Select
                  value={selectedReferenciel}
                  onValueChange={setSelectedReferenciel}
                  disabled={isLoading}
                >
                  <SelectTrigger id="referenciel">
                    <SelectValue placeholder="Sélectionnez un référentiel" />
                  </SelectTrigger>
                  <SelectContent>
                    {referenciels.map((ref) => (
                      <SelectItem key={ref.id} value={ref.id.toString()}>
                        {ref.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="topic">Sujet du quiz</Label>
              <Input
                id="topic"
                placeholder="Ex: Arrêt cardio-respiratoire, Position Latérale de Sécurité..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="questionCount">Nombre de questions</Label>
                <Select
                  value={questionCount}
                  onValueChange={setQuestionCount}
                  disabled={isLoading}
                >
                  <SelectTrigger id="questionCount">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    {["5", "10", "15", "20", "25", "30"].map((count) => (
                      <SelectItem key={count} value={count}>
                        {count} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="level">Niveau (optionnel)</Label>
                <Input
                  id="level"
                  placeholder="Ex: PSE1"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading || referenciels.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse et génération...
                </>
              ) : (
                "Lancer la génération"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
