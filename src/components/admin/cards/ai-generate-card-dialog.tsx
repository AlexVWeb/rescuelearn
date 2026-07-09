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
import { Checkbox } from "@/components/ui/checkbox";
import { generateLearningCardsWithAiAction } from "@/app/actions/ai-learning-card-actions";
import { bulkCreateLearningCardsAction } from "@/app/actions/learning-card-actions";
import {
  AlertCircle,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ReferencielSimple {
  id: number;
  title: string;
}

interface GeneratedCard {
  theme: string;
  niveau: string;
  info: string;
  reference: string;
}

interface AiGenerateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenciels: ReferencielSimple[];
}

export function AiGenerateCardDialog({
  open,
  onOpenChange,
  referenciels,
}: AiGenerateCardDialogProps) {
  const router = useRouter();
  const [selectedReferenciel, setSelectedReferenciel] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState<string>("10");
  const [level, setLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow State
  const [step, setStep] = useState<"form" | "review">("form");
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    if (open) {
      if (referenciels.length > 0 && !selectedReferenciel) {
        setSelectedReferenciel(referenciels[0].id.toString());
      }
    } else {
      // Reset state on close
      setTopic("");
      setLevel("");
      setCardCount("10");
      setError(null);
      setStep("form");
      setGeneratedCards([]);
      setSelectedIndices({});
    }
  }, [open, referenciels, selectedReferenciel]);

  const handleGenerate = async (e: React.FormEvent) => {
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
      const res = await generateLearningCardsWithAiAction({
        referencielId: parseInt(selectedReferenciel, 10),
        topic,
        cardCount: parseInt(cardCount, 10),
        level: level.trim() || undefined,
      });

      if (res.success && res.data?.cards) {
        setGeneratedCards(res.data.cards);
        // Select all by default
        const initialSelections: Record<number, boolean> = {};
        res.data.cards.forEach((_: GeneratedCard, idx: number) => {
          initialSelections[idx] = true;
        });
        setSelectedIndices(initialSelections);
        setStep("review");
      } else {
        setError(res.error || "Une erreur est survenue lors de la génération.");
      }
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectCard = (index: number) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleImport = async () => {
    const cardsToImport = generatedCards.filter(
      (_, idx) => selectedIndices[idx]
    );
    if (cardsToImport.length === 0) {
      setError("Veuillez sélectionner au moins une carte à importer.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await bulkCreateLearningCardsAction({
        referencielId: parseInt(selectedReferenciel, 10),
        cards: cardsToImport,
      });

      if (res.success) {
        toast.success(
          `${res.count} cartes d'apprentissage importées avec succès !`
        );
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error || "L'importation a échoué.");
      }
    } catch {
      setError("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const allSelected =
    generatedCards.length > 0 &&
    generatedCards.every((_, idx) => selectedIndices[idx]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIndices({});
    } else {
      const all: Record<number, boolean> = {};
      generatedCards.forEach((_, idx) => {
        all[idx] = true;
      });
      setSelectedIndices(all);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === "review"
            ? "max-h-[85vh] overflow-y-auto sm:max-w-[700px]"
            : "sm:max-w-[500px]"
        }
      >
        {step === "form" ? (
          <form onSubmit={handleGenerate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 animate-pulse text-blue-600" />
                Générer avec l'IA Gemini
              </DialogTitle>
              <DialogDescription>
                L'IA va extraire des fiches ou cartes d'apprentissage
                synthétiques du PDF du référentiel sélectionné.
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
                    Aucun référentiel PDF disponible. Veuillez en ajouter un
                    d'abord dans l'onglet Référentiels.
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
                <Label htmlFor="topic">Sujet des cartes</Label>
                <Input
                  id="topic"
                  placeholder="Ex: Hémorragies externes, Obstruction des voies aériennes..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cardCount">Nombre de cartes</Label>
                  <Select
                    value={cardCount}
                    onValueChange={setCardCount}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="cardCount">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      {["5", "10", "15", "20", "25", "30"].map((count) => (
                        <SelectItem key={count} value={count}>
                          {count} cartes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="level">Niveau (optionnel)</Label>
                  <Input
                    id="level"
                    placeholder="Ex: PSE1, PSC1..."
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
                    Génération...
                  </>
                ) : (
                  "Générer"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStep("form")}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <DialogTitle>Vérification des cartes générées</DialogTitle>
              </div>
              <DialogDescription>
                Sélectionnez les cartes d'apprentissage générées par l'IA que
                vous souhaitez importer.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] space-y-4 overflow-y-auto py-4 pr-1">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2 border-b pb-2">
                <Checkbox
                  id="selectAll"
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={isLoading}
                />
                <label
                  htmlFor="selectAll"
                  className="cursor-pointer text-sm font-semibold select-none"
                >
                  Sélectionner tout ({generatedCards.length} cartes)
                </label>
              </div>

              <div className="space-y-3">
                {generatedCards.map((card, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                      selectedIndices[idx]
                        ? "border-blue-200 bg-blue-50/50"
                        : "bg-white"
                    }`}
                  >
                    <Checkbox
                      id={`card-${idx}`}
                      checked={!!selectedIndices[idx]}
                      onCheckedChange={() => toggleSelectCard(idx)}
                      disabled={isLoading}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          {card.theme}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          {card.niveau}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-600">
                        {card.info}
                      </p>
                      <div className="pt-1 text-[10px] font-medium text-gray-400">
                        Source : {card.reference}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isLoading}
              >
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={
                  isLoading || !Object.values(selectedIndices).some(Boolean)
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmer l'importation
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
