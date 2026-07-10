"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  BookOpen,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: number;
  text: string;
}

interface LearningCard {
  id: number;
  theme: string;
  info: string;
}

interface Exercise {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME";
  questionId?: number | null;
  learningCardId?: number | null;
  courseTitle?: string | null;
  courseContent?: string | null;
}

interface LessonExercisesBuilderProps {
  initialExercises: Exercise[];
  availableQuestions: Question[];
  availableLearningCards: LearningCard[];
  onSave: (exercises: Exercise[]) => Promise<void>;
}

export function LessonExercisesBuilder({
  initialExercises,
  availableQuestions,
  availableLearningCards,
  onSave,
}: LessonExercisesBuilderProps) {
  const [exercises, setExercises] = useState<Exercise[]>(
    initialExercises.map((ex) => ({
      type: ex.type,
      questionId: ex.questionId || null,
      learningCardId: ex.learningCardId || null,
      courseTitle: ex.courseTitle || "",
      courseContent: ex.courseContent || "",
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddExercise = (type: Exercise["type"]) => {
    const newEx: Exercise = {
      type,
      questionId:
        type === "QUIZ_QUESTION" && availableQuestions[0]
          ? availableQuestions[0].id
          : null,
      learningCardId:
        type === "FLASHCARD" && availableLearningCards[0]
          ? availableLearningCards[0].id
          : null,
      courseTitle: type === "MICRO_COURSE" ? "Nouveau cours" : "",
      courseContent:
        type === "MICRO_COURSE"
          ? "# Introduction\nSaisissez le contenu en Markdown..."
          : "",
    };
    setExercises([...exercises, newEx]);
  };

  const handleRemoveExercise = (index: number) => {
    const updated = [...exercises];
    updated.splice(index, 1);
    setExercises(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const updated = [...exercises];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setExercises(updated);
  };

  const handleUpdateExercise = (index: number, fields: Partial<Exercise>) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], ...fields };
    setExercises(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(exercises);
      toast.success("Exercices de la leçon sauvegardés !");
    } catch {
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Séquence d'apprentissage
          </h2>
          <p className="text-muted-foreground text-sm">
            Composez la session en alternant cours théoriques, quiz ciblés et
            mémorisations.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Sauvegarde..." : "Sauvegarder la leçon"}
        </Button>
      </div>

      <div className="space-y-4">
        {exercises.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
            <GraduationCap className="text-muted-foreground/50 mb-4 h-12 w-12" />
            <p className="font-semibold text-gray-700">
              Aucun exercice dans cette leçon
            </p>
            <p className="text-xs">
              Ajoutez un premier exercice ci-dessous ou générez avec l'IA.
            </p>
          </div>
        ) : (
          exercises.map((ex, index) => {
            const isFirst = index === 0;
            const isLast = index === exercises.length - 1;

            return (
              <Card
                key={index}
                className="relative border-l-4 border-l-blue-600"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                      {index + 1}
                    </span>
                    <CardTitle className="flex items-center gap-1.5 text-sm font-bold">
                      {ex.type === "MICRO_COURSE" && (
                        <>
                          <BookOpen className="h-4 w-4 text-emerald-600" />
                          <span>Micro-cours</span>
                        </>
                      )}
                      {ex.type === "QUIZ_QUESTION" && (
                        <>
                          <HelpCircle className="h-4 w-4 text-blue-600" />
                          <span>Question de Quiz</span>
                        </>
                      )}
                      {ex.type === "FLASHCARD" && (
                        <>
                          <GraduationCap className="h-4 w-4 text-purple-600" />
                          <span>Flashcard</span>
                        </>
                      )}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isFirst}
                      onClick={() => handleMove(index, "up")}
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLast}
                      onClick={() => handleMove(index, "down")}
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveExercise(index)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* MICRO-COURSE CONFIG */}
                  {ex.type === "MICRO_COURSE" && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Titre du cours</Label>
                        <Input
                          value={ex.courseTitle || ""}
                          onChange={(e) =>
                            handleUpdateExercise(index, {
                              courseTitle: e.target.value,
                            })
                          }
                          placeholder="Ex: Le massage cardiaque"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Contenu (Format Markdown)</Label>
                        <Textarea
                          className="min-h-[120px] font-mono"
                          value={ex.courseContent || ""}
                          onChange={(e) =>
                            handleUpdateExercise(index, {
                              courseContent: e.target.value,
                            })
                          }
                          placeholder="Saisissez votre cours en Markdown..."
                        />
                      </div>
                    </div>
                  )}

                  {/* QUIZ CONFIG */}
                  {ex.type === "QUIZ_QUESTION" && (
                    <div className="grid gap-2">
                      <Label>Sélectionner la question</Label>
                      <Select
                        value={String(ex.questionId || "")}
                        onValueChange={(val) =>
                          handleUpdateExercise(index, {
                            questionId: parseInt(val, 10),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une question..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuestions.map((q) => (
                            <SelectItem key={q.id} value={String(q.id)}>
                              {q.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* FLASHCARD CONFIG */}
                  {ex.type === "FLASHCARD" && (
                    <div className="grid gap-2">
                      <Label>Sélectionner la fiche mémo</Label>
                      <Select
                        value={String(ex.learningCardId || "")}
                        onValueChange={(val) =>
                          handleUpdateExercise(index, {
                            learningCardId: parseInt(val, 10),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une fiche..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLearningCards.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              [{c.theme}] {c.info.substring(0, 80)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add exercise buttons */}
      <div className="bg-muted/20 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed p-4">
        <span className="text-muted-foreground mr-2 text-xs font-bold">
          AJOUTER ÉTAPE :
        </span>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5"
          onClick={() => handleAddExercise("MICRO_COURSE")}
        >
          <Plus className="h-4 w-4" /> Micro-cours
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5"
          onClick={() => handleAddExercise("QUIZ_QUESTION")}
        >
          <Plus className="h-4 w-4" /> Question de Quiz
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5"
          onClick={() => handleAddExercise("FLASHCARD")}
        >
          <Plus className="h-4 w-4" /> Flashcard
        </Button>
      </div>
    </div>
  );
}
