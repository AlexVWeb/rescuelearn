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
import { generateSNVScenarioWithAiAction } from "@/app/actions/ai-snv-actions";
import { importSNVScenarioAction } from "@/app/actions/snv-actions";
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

interface GeneratedVictim {
  description: string;
  correctAnswer: number;
  explanation: string;
}

interface GeneratedScenario {
  title: string;
  level: string;
  description: string;
  victimes: GeneratedVictim[];
}

interface AiGenerateScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenciels: ReferencielSimple[];
}

export function AiGenerateScenarioDialog({
  open,
  onOpenChange,
  referenciels,
}: AiGenerateScenarioDialogProps) {
  const router = useRouter();
  const [selectedReferenciel, setSelectedReferenciel] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [victimCount, setVictimCount] = useState<string>("10");
  const [level, setLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flow State
  const [step, setStep] = useState<"form" | "review">("form");
  const [generatedScenario, setGeneratedScenario] =
    useState<GeneratedScenario | null>(null);
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
      setVictimCount("10");
      setError(null);
      setStep("form");
      setGeneratedScenario(null);
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
      const res = await generateSNVScenarioWithAiAction({
        referencielId: parseInt(selectedReferenciel, 10),
        topic,
        victimCount: parseInt(victimCount, 10),
        level: level.trim() || undefined,
      });

      if (res.success && res.data) {
        setGeneratedScenario(res.data);
        const initialSelections: Record<number, boolean> = {};
        res.data.victimes.forEach((_: GeneratedVictim, idx: number) => {
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

  const toggleSelectVictim = (index: number) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleImport = async () => {
    if (!generatedScenario) return;

    const victimsToImport = generatedScenario.victimes.filter(
      (_, idx) => selectedIndices[idx]
    );
    if (victimsToImport.length === 0) {
      setError("Veuillez sélectionner au moins une victime à importer.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await importSNVScenarioAction({
        title: generatedScenario.title,
        level: generatedScenario.level,
        description: generatedScenario.description,
        victimes: victimsToImport,
      });

      if (res.success) {
        toast.success(
          `Scénario "${generatedScenario.title}" importé avec ${victimsToImport.length} victimes !`
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

  const allSelected = !!(
    generatedScenario &&
    generatedScenario.victimes.length > 0 &&
    generatedScenario.victimes.every((_, idx) => selectedIndices[idx])
  );

  const toggleSelectAll = () => {
    if (!generatedScenario) return;
    if (allSelected) {
      setSelectedIndices({});
    } else {
      const all: Record<number, boolean> = {};
      generatedScenario.victimes.forEach((_, idx) => {
        all[idx] = true;
      });
      setSelectedIndices(all);
    }
  };

  const getTriageStyle = (answer: number) => {
    switch (answer) {
      case 0:
        return "bg-green-100 text-green-800 border-green-200";
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 2:
        return "bg-red-100 text-red-800 border-red-200";
      case 3:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTriageLabel = (answer: number) => {
    switch (answer) {
      case 0:
        return "Vert (Blessé léger)";
      case 1:
        return "Jaune (Urgence Relative)";
      case 2:
        return "Rouge (Urgence Absolue)";
      case 3:
        return "Noir (Décédé)";
      default:
        return "Inconnu";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          step === "review"
            ? "max-h-[85vh] overflow-y-auto sm:max-w-[750px]"
            : "sm:max-w-[500px]"
        }
      >
        {step === "form" ? (
          <form onSubmit={handleGenerate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 animate-pulse text-blue-600" />
                Générer un scénario SNV avec l'IA
              </DialogTitle>
              <DialogDescription>
                Configurez le sujet de la catastrophe et laissez l'IA concevoir
                la situation et ses victimes triées selon le référentiel.
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
                    Aucun référentiel PDF disponible. Veuillez en uploader un
                    dans l'onglet Référentiels d'abord.
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
                <Label htmlFor="topic">Sujet du scénario (Catastrophe)</Label>
                <Input
                  id="topic"
                  placeholder="Ex: Accident de train, Effondrement de tribune, Attentat..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="victimCount">Nombre de victimes</Label>
                  <Select
                    value={victimCount}
                    onValueChange={setVictimCount}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="victimCount">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      {["5", "10", "15", "20", "25", "30"].map((count) => (
                        <SelectItem key={count} value={count}>
                          {count} victimes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="level">Niveau de formation (optionnel)</Label>
                  <Input
                    id="level"
                    placeholder="Ex: PSE1, PSE2..."
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
                    Génération du scénario...
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
                <DialogTitle>Vérification du scénario généré</DialogTitle>
              </div>
              <DialogDescription>
                Vérifiez la situation globale et cochez les victimes à
                enregistrer.
              </DialogDescription>
            </DialogHeader>

            {generatedScenario && (
              <div className="max-h-[55vh] space-y-4 overflow-y-auto py-4 pr-1">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Scenario details */}
                <div className="bg-muted/40 space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">
                      {generatedScenario.title}
                    </h3>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                      Niveau : {generatedScenario.level}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 italic">
                    {generatedScenario.description}
                  </p>
                </div>

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
                    Sélectionner toutes les victimes (
                    {generatedScenario.victimes.length})
                  </label>
                </div>

                {/* Victims list */}
                <div className="space-y-3">
                  {generatedScenario.victimes.map((victim, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                        selectedIndices[idx]
                          ? "border-blue-200 bg-blue-50/20"
                          : "bg-white"
                      }`}
                    >
                      <Checkbox
                        id={`victim-${idx}`}
                        checked={!!selectedIndices[idx]}
                        onCheckedChange={() => toggleSelectVictim(idx)}
                        disabled={isLoading}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">
                            Victime #{idx + 1}
                          </span>
                          <span
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${getTriageStyle(victim.correctAnswer)}`}
                          >
                            {getTriageLabel(victim.correctAnswer)}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium text-gray-700">
                          {victim.description}
                        </p>
                        <div className="bg-muted/30 rounded border border-dashed p-2 text-[11px] text-gray-600">
                          <span className="font-semibold">
                            Justification :{" "}
                          </span>
                          {victim.explanation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    Enregistrement...
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
