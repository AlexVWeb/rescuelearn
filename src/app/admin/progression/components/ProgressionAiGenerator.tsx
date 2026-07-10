"use client";

import React, { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Check } from "lucide-react";
import { generateProgressionNodeWithAiAction } from "@/app/actions/progression-admin-actions";
import { toast } from "sonner";

interface Referenciel {
  id: number;
  title: string;
}

import {
  AiGeneratedExercise,
  AiGeneratedNode,
  AiGeneratedExerciseForBuilder,
} from "@/types/progression";

interface ProgressionAiGeneratorProps {
  referenciels: Referenciel[];
  defaultLevel?: string;
  onImport: (generatedExercises: AiGeneratedExerciseForBuilder[]) => void;
}

export function ProgressionAiGenerator({
  referenciels,
  defaultLevel = "GQS",
  onImport,
}: ProgressionAiGeneratorProps) {
  const [referencielId, setReferencielId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(defaultLevel);

  const [microCourseCount, setMicroCourseCount] = useState(1);
  const [quizCount, setQuizCount] = useState(2);
  const [flashcardCount, setFlashcardCount] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<AiGeneratedNode | null>(
    null
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referencielId || !topic.trim()) {
      toast.error("Veuillez sélectionner un référentiel et saisir un sujet.");
      return;
    }

    setIsLoading(true);
    setGeneratedData(null);

    try {
      const res = await generateProgressionNodeWithAiAction({
        referencielId: parseInt(referencielId, 10),
        topic,
        level,
        structureConfig: {
          microCourseCount,
          quizCount,
          flashcardCount,
        },
      });

      if (res.success && res.data) {
        setGeneratedData(res.data);
        toast.success("Leçon générée par l'IA avec succès !");
      } else {
        toast.error(res.error || "Échec de la génération par l'IA.");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (!generatedData || !generatedData.exercises) return;

    // Map AI output to builder compatible structures
    const exercisesToImport: AiGeneratedExerciseForBuilder[] =
      generatedData.exercises.map((ex: AiGeneratedExercise) => {
        if (ex.type === "MICRO_COURSE") {
          return {
            type: "MICRO_COURSE",
            courseTitle: ex.courseTitle || "Micro-cours",
            courseContent:
              ex.courseContent ||
              ex.explanation ||
              ex.description ||
              ex.content ||
              "",
          };
        }
        if (ex.type === "QUIZ_QUESTION") {
          return {
            type: "QUIZ_QUESTION",
            _newQuestion: {
              text: ex.questionText || "",
              options: ex.options || [],
              correctAnswer: String(ex.correctAnswer ?? 0),
              explanation: ex.explanation || "",
            },
          };
        }
        // ex.type === "FLASHCARD"
        return {
          type: "FLASHCARD",
          _newFlashcard: {
            theme: ex.flashcardTheme || topic,
            info: ex.flashcardInfo || "",
            reference: ex.flashcardReference || "",
            niveau: level,
          },
        };
      });

    onImport(exercisesToImport);
    setGeneratedData(null);
    toast.success(
      "Leçon importée dans l'éditeur ! N'oubliez pas de sauvegarder."
    );
  };

  return (
    <Card className="border-indigo-100 bg-indigo-50/20">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2 text-sm font-extrabold tracking-wider text-indigo-700 uppercase">
          <Sparkles className="h-5 w-5 animate-pulse fill-current text-indigo-600" />
          <span>Générateur de Leçon Gemini IA</span>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ai-ref">Référentiel source</Label>
            <Select value={referencielId} onValueChange={setReferencielId}>
              <SelectTrigger id="ai-ref">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {referenciels.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-level">Niveau de formation</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="ai-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GQS">GQS</SelectItem>
                <SelectItem value="PSC">PSC</SelectItem>
                <SelectItem value="SST">SST</SelectItem>
                <SelectItem value="PSE">PSE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ai-topic">Sujet de la leçon</Label>
            <Input
              id="ai-topic"
              placeholder="Ex: Pose du garrot tourniquet ou Massage cardiaque"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div className="grid gap-2">
              <Label className="text-xs">Micro-cours</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={microCourseCount}
                onChange={(e) =>
                  setMicroCourseCount(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Quiz (questions)</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={quizCount}
                onChange={(e) =>
                  setQuizCount(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Flashcards</Label>
              <Input
                type="number"
                min={0}
                max={5}
                value={flashcardCount}
                onChange={(e) =>
                  setFlashcardCount(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          </div>

          <div className="pt-2 sm:col-span-2">
            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération par Gemini en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer la structure
                </>
              )}
            </Button>
          </div>
        </form>

        {generatedData && (
          <div className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-white p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-bold text-indigo-950">
                  {generatedData.title}
                </h4>
                <p className="text-muted-foreground text-xs">
                  {generatedData.description}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleImport}
              >
                <Check className="mr-1 h-4 w-4" /> Importer
              </Button>
            </div>
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {generatedData.exercises.map(
                (ex: AiGeneratedExercise, idx: number) => (
                  <div
                    key={idx}
                    className="bg-muted flex items-center justify-between rounded p-2 text-xs"
                  >
                    <span>
                      <strong>
                        Étape {idx + 1} ({ex.type})
                      </strong>
                      :{" "}
                      {ex.courseTitle ||
                        ex.questionText ||
                        ex.flashcardInfo?.substring(0, 50)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
