"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Exercise } from "@/types/progression";
import { answerIndex } from "@/lib/quiz-answers";
import { ExerciseItemPicker, type PickerItem } from "./ExerciseItemPicker";
import { VideoExerciseConfig } from "./VideoExerciseConfig";

export interface AdminQuestion {
  id: number;
  text: string;
  correctAnswer: string;
  quiz: { title: string };
  options: { text: string }[];
}

interface LearningCard {
  id: number;
  theme: string;
  info: string;
}

interface LessonExercisesBuilderProps {
  initialExercises: Exercise[];
  availableQuestions: AdminQuestion[];
  availableLearningCards: LearningCard[];
  onSave: (exercises: Exercise[]) => Promise<void>;
}

const TYPE_ACCENT: Record<Exercise["type"], string> = {
  MICRO_COURSE: "border-l-emerald-500",
  QUIZ_QUESTION: "border-l-blue-600",
  FLASHCARD: "border-l-purple-500",
  MINI_GAME: "border-l-amber-500",
  VIDEO: "border-l-rose-500",
};

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
      videoUrl: ex.videoUrl || "",
      videoTitle: ex.videoTitle || "",
      videoDurationSec: ex.videoDurationSec ?? null,
      // Questions / fiches générées par l'IA, créées en base à la sauvegarde
      _newQuestion: ex._newQuestion,
      _newFlashcard: ex._newFlashcard,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const questionItems = useMemo<PickerItem[]>(
    () =>
      availableQuestions.map((q) => {
        const correct = answerIndex(q.correctAnswer);
        return {
          id: q.id,
          title: q.text,
          subtitle: q.quiz.title,
          options: q.options.map((opt, idx) => ({
            text: opt.text,
            correct: idx === correct,
          })),
        };
      }),
    [availableQuestions]
  );

  const cardItems = useMemo<PickerItem[]>(
    () =>
      availableLearningCards.map((c) => ({
        id: c.id,
        title: c.info,
        subtitle: c.theme,
      })),
    [availableLearningCards]
  );

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

  // Forme fonctionnelle : l'aperçu vidéo met à jour la durée de façon asynchrone
  const handleUpdateExercise = (index: number, fields: Partial<Exercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...fields } : ex))
    );
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
                className={`relative min-w-0 gap-3 border-l-4 py-4 ${TYPE_ACCENT[ex.type]}`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
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
                      {ex.type === "VIDEO" && (
                        <>
                          <PlayCircle className="h-4 w-4 text-rose-600" />
                          <span>Vidéo</span>
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
                      <Label>Question</Label>
                      <ExerciseItemPicker
                        items={questionItems}
                        selected={
                          ex._newQuestion
                            ? {
                                id: -1,
                                title: ex._newQuestion.text,
                                options: ex._newQuestion.options.map(
                                  (opt, oIdx) => ({
                                    text: opt,
                                    correct:
                                      oIdx ===
                                      answerIndex(
                                        ex._newQuestion!.correctAnswer
                                      ),
                                  })
                                ),
                              }
                            : (questionItems.find(
                                (q) => q.id === ex.questionId
                              ) ?? null)
                        }
                        selectedBadge={
                          ex._newQuestion
                            ? "Nouvelle · créée à la sauvegarde"
                            : undefined
                        }
                        onSelect={(id) =>
                          handleUpdateExercise(index, {
                            questionId: id,
                            _newQuestion: undefined,
                          })
                        }
                        placeholder="Choisir une question..."
                        dialogTitle="Choisir une question"
                        searchPlaceholder="Rechercher par texte ou banque de quiz..."
                      />
                    </div>
                  )}

                  {/* FLASHCARD CONFIG */}
                  {ex.type === "FLASHCARD" && (
                    <div className="grid gap-2">
                      <Label>Fiche mémo</Label>
                      <ExerciseItemPicker
                        items={cardItems}
                        selected={
                          ex._newFlashcard
                            ? {
                                id: -1,
                                title: ex._newFlashcard.info,
                                subtitle: ex._newFlashcard.theme,
                              }
                            : (cardItems.find(
                                (c) => c.id === ex.learningCardId
                              ) ?? null)
                        }
                        selectedBadge={
                          ex._newFlashcard
                            ? "Nouvelle · créée à la sauvegarde"
                            : undefined
                        }
                        onSelect={(id) =>
                          handleUpdateExercise(index, {
                            learningCardId: id,
                            _newFlashcard: undefined,
                          })
                        }
                        placeholder="Choisir une fiche..."
                        dialogTitle="Choisir une fiche mémo"
                        searchPlaceholder="Rechercher par thème ou contenu..."
                      />
                    </div>
                  )}

                  {/* VIDEO CONFIG */}
                  {ex.type === "VIDEO" && (
                    <VideoExerciseConfig
                      exercise={ex}
                      onChange={(fields) => handleUpdateExercise(index, fields)}
                    />
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
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1.5"
          onClick={() => handleAddExercise("VIDEO")}
        >
          <Plus className="h-4 w-4" /> Vidéo
        </Button>
      </div>
    </div>
  );
}
