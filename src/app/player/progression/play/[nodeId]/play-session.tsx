"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Heart,
  Check,
  AlertCircle,
  ArrowRight,
  RotateCw,
  Volume2,
  VolumeX,
  BookOpen,
} from "lucide-react";
import { submitNodeCompletionAction } from "@/app/actions/progression-player-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { marked } from "marked";
import { PlaySessionExercise } from "@/types/progression";

interface PlaySessionClientProps {
  sessionData: {
    nodeId: string;
    title: string;
    xpReward: number;
    exercises: PlaySessionExercise[];
  };
}

export default function PlaySessionClient({
  sessionData,
}: PlaySessionClientProps) {
  const { nodeId, title, exercises } = sessionData;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Game states
  const [hearts, setHearts] = useState(5);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Exercise validation state
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(
    null
  );
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const router = useRouter();

  const currentExercise = exercises[currentIndex];
  const progressPercent =
    exercises.length > 0 ? (currentIndex / exercises.length) * 100 : 100;

  const playSound = (type: "correct" | "incorrect" | "success" | "click") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "correct") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "incorrect") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(110, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24); // C6
        osc.stop(ctx.currentTime + 0.45);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {
      // Audio fallback
    }
  };

  const handleValidateAnswer = () => {
    if (selectedOptionIdx === null) return;
    setIsAnswered(true);

    const isCorrect =
      selectedOptionIdx === currentExercise.question?.correctAnswerIndex;
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      playSound("correct");
    } else {
      setHearts((prev) => {
        const nextHearts = prev - 1;
        if (nextHearts <= 0) {
          setIsGameOver(true);
          playSound("incorrect");
        }
        return nextHearts;
      });
      playSound("incorrect");
    }
  };

  const handleNext = async () => {
    playSound("click");
    setSelectedOptionIdx(null);
    setIsAnswered(false);
    setIsCardFlipped(false);

    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // All exercises finished, submit progress
      const finalScore =
        exercises.length > 0
          ? Math.round((correctAnswers / exercises.length) * 100)
          : 100;
      try {
        const res = await submitNodeCompletionAction(nodeId, finalScore);
        if (res.success && res.data) {
          setXpEarned(res.data.xpGained);
          setIsFinished(true);
          playSound("success");
        } else {
          toast.error(res.error || "Erreur de validation.");
        }
      } catch {
        toast.error("Une erreur inattendue est survenue.");
      }
    }
  };

  const renderMarkdown = (md: string) => {
    if (!md) return null;
    const rawHtml = marked.parse(md, { async: false }) as string;
    return <div dangerouslySetInnerHTML={{ __html: rawHtml }} />;
  };

  if (isGameOver) {
    return (
      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col items-center justify-center space-y-6 p-6 text-center">
        <div className="animate-bounce text-6xl">💔</div>
        <h2 className="text-2xl font-black text-red-600">Plus de vies !</h2>
        <p className="text-sm leading-relaxed text-gray-500">
          Ne vous découragez pas, le secourisme demande de l'entraînement.
          Révisez vos fiches et réessayez !
        </p>
        <Button
          className="w-full rounded-2xl bg-blue-600 py-6 font-bold text-white hover:bg-blue-700"
          onClick={() => router.push("/player/progresser")}
        >
          Retourner au parcours
        </Button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="animate-fade-in mx-auto flex min-h-[85vh] max-w-md flex-col items-center justify-center space-y-6 p-6 text-center">
        <div className="animate-bounce text-6xl">🎉</div>
        <div>
          <h2 className="text-3xl font-black text-emerald-600">
            Leçon complétée !
          </h2>
          <p className="mt-1 text-sm text-gray-500">{title}</p>
        </div>
        <div className="flex w-full items-center justify-around rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="text-center">
            <span className="block text-2xl font-black text-amber-600">
              +{xpEarned}
            </span>
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
              XP gagnés
            </span>
          </div>
          <div className="h-8 w-px bg-amber-200" />
          <div className="text-center">
            <span className="block text-2xl font-black text-emerald-600">
              {exercises.length > 0
                ? Math.round((correctAnswers / exercises.length) * 100)
                : 100}
              %
            </span>
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
              Précision
            </span>
          </div>
        </div>
        <Button
          className="w-full rounded-2xl bg-emerald-600 py-6 font-bold text-white hover:bg-emerald-700"
          onClick={() => router.push("/player/progresser")}
        >
          Continuer l'aventure
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[90vh] max-w-2xl flex-col justify-between px-4 py-6">
      {/* Top Header Session Bar */}
      <header className="flex items-center justify-between gap-4 border-b pb-4">
        <button
          onClick={() => router.push("/player/progresser")}
          className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          aria-label="Quitter la leçon"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Progress Bar */}
        <div className="h-3 flex-1 overflow-hidden rounded-full border border-gray-200/50 bg-gray-100">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-bold text-red-500">
            <Heart className="h-5 w-5 fill-current" />
            <span className="text-sm">{hearts}</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main interactive area */}
      <main className="my-8 flex flex-1 flex-col justify-center">
        {/* MICRO_COURSE TYPE */}
        {currentExercise.type === "MICRO_COURSE" && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-800">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-black tracking-wider uppercase">
                Concept clé
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900">
              {currentExercise.courseTitle}
            </h2>
            <div className="prose max-w-none rounded-3xl border bg-white p-6 shadow-sm">
              {renderMarkdown(currentExercise.courseContent || "")}
            </div>
          </div>
        )}

        {/* QUIZ_QUESTION TYPE */}
        {currentExercise.type === "QUIZ_QUESTION" && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl leading-tight font-black text-gray-900">
              {currentExercise.question?.text}
            </h3>

            <div className="grid gap-3">
              {currentExercise.question?.options.map(
                (opt: { id?: string | number; text: string }, idx: number) => {
                  const isSelected = selectedOptionIdx === idx;
                  const isCorrectAnswer =
                    idx === currentExercise.question?.correctAnswerIndex;

                  return (
                    <button
                      key={opt.id || idx}
                      disabled={isAnswered}
                      onClick={() => {
                        setSelectedOptionIdx(idx);
                        playSound("click");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left text-sm font-bold transition-all focus:outline-none",
                        isSelected
                          ? "border-blue-500 bg-blue-50/50 text-blue-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                        isAnswered &&
                          isCorrectAnswer &&
                          "border-green-500 bg-green-50 text-green-900",
                        isAnswered &&
                          isSelected &&
                          !isCorrectAnswer &&
                          "border-red-500 bg-red-50 text-red-900"
                      )}
                    >
                      <span>{opt.text}</span>
                      {isAnswered && isCorrectAnswer && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                      {isAnswered && isSelected && !isCorrectAnswer && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            {/* Explanation box after submit */}
            {isAnswered && currentExercise.question?.explanation && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">
                <strong>💡 Explication :</strong>{" "}
                {currentExercise.question?.explanation}
              </div>
            )}
          </div>
        )}

        {/* FLASHCARD TYPE */}
        {currentExercise.type === "FLASHCARD" && (
          <div className="animate-fade-in flex flex-col items-center justify-center space-y-6">
            <div
              className="h-64 w-full max-w-sm cursor-pointer [perspective:1000px]"
              onClick={() => {
                setIsCardFlipped(!isCardFlipped);
                playSound("click");
              }}
            >
              <div
                className={cn(
                  "relative h-full w-full rounded-3xl border-2 border-b-[8px] shadow-md transition-transform duration-500 [transform-style:preserve-3d] hover:shadow-lg",
                  isCardFlipped
                    ? "[transform:rotateY(180deg)] border-purple-500"
                    : "border-blue-500"
                )}
              >
                {/* Front Side */}
                <div className="absolute inset-0 flex h-full w-full flex-col justify-between rounded-2xl bg-white p-6 [backface-visibility:hidden]">
                  <span className="self-start rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black tracking-widest text-blue-600 uppercase">
                    MÉMO : {currentExercise.flashcard?.theme}
                  </span>
                  <div className="py-4 text-center text-lg font-black text-gray-800">
                    Tapez pour révéler l'information...
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400">
                    <RotateCw className="animate-spin-slow h-4 w-4" /> Retourner
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 flex h-full w-full [transform:rotateY(180deg)] flex-col justify-between rounded-2xl bg-purple-50 p-6 [backface-visibility:hidden]">
                  <span className="self-start rounded-full bg-purple-100 px-3 py-1 text-[10px] font-black tracking-widest text-purple-700 uppercase">
                    EXPLICATION
                  </span>
                  <p className="max-h-36 overflow-y-auto text-center text-sm font-bold text-purple-950">
                    {currentExercise.flashcard?.info}
                  </p>
                  <div className="text-center text-[10px] font-bold text-purple-400">
                    Réf: {currentExercise.flashcard?.reference}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-center text-xs">
              Mémorisez bien cette notion de secours puis passez à la suite.
            </p>
          </div>
        )}
      </main>

      {/* Action Footer Navigation */}
      <footer className="border-t pt-4">
        {currentExercise.type === "QUIZ_QUESTION" && !isAnswered ? (
          <Button
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-6 font-bold text-white hover:bg-blue-700"
            disabled={selectedOptionIdx === null}
            onClick={handleValidateAnswer}
          >
            Valider la réponse
          </Button>
        ) : (
          <Button
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-6 font-bold text-white hover:bg-blue-700"
            onClick={handleNext}
          >
            Continuer
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </footer>
    </div>
  );
}
