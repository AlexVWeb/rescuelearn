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
import { getReferencielAnalysisAction } from "@/app/actions/referenciel-topic-actions";
import {
  TopicPicker,
  type PickableTopic,
} from "@/components/admin/topic-picker";
import { suggestedQuestionCount } from "@/lib/topic-coverage";
import { AlertCircle, BrainCircuit, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReferencielSimple {
  id: number;
  title: string;
  analysisStatus: string;
}

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerationSuccess: (data: unknown) => void;
  // Ouverture depuis la page des sujets d'un référentiel
  initialReferencielId?: number;
  initialTopicIds?: string[];
}

// Sujets exploitables dès qu'une analyse a produit des résultats (même partielle)
const hasTopics = (ref?: ReferencielSimple) =>
  ref?.analysisStatus === "DONE" || ref?.analysisStatus === "FAILED";

export function AiGenerateDialog({
  open,
  onOpenChange,
  onGenerationSuccess,
  initialReferencielId,
  initialTopicIds,
}: AiGenerateDialogProps) {
  const [referenciels, setReferenciels] = useState<ReferencielSimple[]>([]);
  const [selectedReferenciel, setSelectedReferenciel] = useState<string>("");
  const [topics, setTopics] = useState<PickableTopic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [freeTopicMode, setFreeTopicMode] = useState(false);
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
          const initial =
            res.find((r) => r.id === initialReferencielId) ?? res[0];
          if (initial) {
            setSelectedReferenciel(initial.id.toString());
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
      setTopics([]);
      setSelectedTopicIds([]);
      setFreeTopicMode(false);
    }
  }, [open, initialReferencielId, initialTopicIds]);

  const currentReferenciel = referenciels.find(
    (r) => r.id.toString() === selectedReferenciel
  );
  const shouldLoadTopics = hasTopics(currentReferenciel);

  // Charge les sujets analysés du référentiel choisi
  useEffect(() => {
    if (!open || !shouldLoadTopics) return;
    let cancelled = false;
    const loadTopics = async () => {
      const res = await getReferencielAnalysisAction(
        parseInt(selectedReferenciel, 10)
      );
      if (cancelled || !res.success) return;
      setTopics(res.data.topics);
      // Présélection transmise à l'ouverture (page des sujets)
      const preselected =
        selectedReferenciel === String(initialReferencielId)
          ? (initialTopicIds ?? []).filter((id) =>
              res.data.topics.some((t) => t.id === id)
            )
          : [];
      setSelectedTopicIds(preselected);
      if (preselected.length) {
        setQuestionCount(
          String(
            suggestedQuestionCount(toCoverage(res.data.topics, preselected))
          )
        );
      }
    };
    loadTopics();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedReferenciel,
    shouldLoadTopics,
    initialReferencielId,
    initialTopicIds,
  ]);

  const useTopicPicker = topics.length > 0 && !freeTopicMode;
  const selectedTopics = topics.filter((t) => selectedTopicIds.includes(t.id));

  const handleReferencielChange = (value: string) => {
    setSelectedReferenciel(value);
    setTopics([]);
    setSelectedTopicIds([]);
  };

  const handleTopicsChange = (ids: string[]) => {
    setSelectedTopicIds(ids);
    setQuestionCount(String(suggestedQuestionCount(toCoverage(topics, ids))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReferenciel) {
      setError("Veuillez sélectionner un référentiel.");
      return;
    }
    if (useTopicPicker && selectedTopicIds.length === 0) {
      setError("Veuillez sélectionner au moins un sujet.");
      return;
    }
    if (!useTopicPicker && !topic.trim()) {
      setError("Veuillez saisir un sujet.");
      return;
    }
    const count = parseInt(questionCount, 10);
    if (!Number.isInteger(count) || count < 1 || count > 30) {
      setError("Le nombre de questions doit être compris entre 1 et 30.");
      return;
    }
    const prompt = useTopicPicker
      ? selectedTopics.map((t) => t.title).join(", ")
      : topic;

    setIsLoading(true);
    setError(null);

    try {
      const res = await generateQuizWithAiAction({
        referencielId: parseInt(selectedReferenciel, 10),
        ...(useTopicPicker ? { topicIds: selectedTopicIds } : { topic }),
        questionCount: count,
        level: level.trim() || undefined,
      });

      if (res.success && res.data) {
        onGenerationSuccess({
          ...res.data,
          referencielId: parseInt(selectedReferenciel, 10),
          generatedByAi: true,
          status: "DRAFT",
          aiPrompt: prompt,
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
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={handleSubmit} className="min-w-0">
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
                  onValueChange={handleReferencielChange}
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

            {useTopicPicker ? (
              <div className="grid min-w-0 gap-2">
                <div className="flex items-center justify-between">
                  <Label>Sujets du référentiel</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setFreeTopicMode(true)}
                  >
                    Saisir un sujet libre
                  </Button>
                </div>
                <TopicPicker
                  topics={topics}
                  selectedIds={selectedTopicIds}
                  onChange={handleTopicsChange}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic">Sujet du quiz</Label>
                  {topics.length > 0 && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => setFreeTopicMode(false)}
                    >
                      Choisir parmi les sujets analysés
                    </Button>
                  )}
                </div>
                <Input
                  id="topic"
                  placeholder="Ex: Arrêt cardio-respiratoire, Position Latérale de Sécurité..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="questionCount">Nombre de questions</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={1}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  disabled={isLoading}
                />
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

function toCoverage(topics: PickableTopic[], ids: string[]) {
  return topics
    .filter((t) => ids.includes(t.id))
    .map((t) => ({
      questionCount: t._count.questions,
      capacity: t.questionCapacity,
    }));
}
