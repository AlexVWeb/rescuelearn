"use client";

import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

import { PlayerStatsBanner } from "./components/PlayerStatsBanner";
import { PlayerOnboarding } from "./components/PlayerOnboarding";
import { MascotWidget } from "./components/MascotWidget";
import { LeaderboardWidget } from "./components/LeaderboardWidget";
import { BoutiqueWidget } from "./components/BoutiqueWidget";
import { SubscriptionWidget } from "./components/SubscriptionWidget";
import {
  getPlayerOnboardingStatusAction,
  savePlayerOnboardingAction,
  resetPlayerOnboardingAction,
} from "@/app/actions/player-actions";
import { useSearchParams } from "next/navigation";
import {
  getQuestionForPlayerAction,
  submitDailyQuestionAnswerAction,
  getDailyQuestionStatsAction,
} from "@/app/actions/player-quiz-actions";
import { DailyStatsWidget } from "./components/DailyStatsWidget";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

interface LevelNode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: "quiz" | "snv" | "card";
  status: "completed" | "current" | "locked";
  xpReward: number;
  themeColor: string;
}

export default function PlayerPage() {
  const [mounted, setMounted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  // Onboarding Wizard States
  const [experience, setExperience] = useState("");
  const [objective, setObjective] = useState("");
  const [expectation, setExpectation] = useState("");

  // Game States
  const [streak] = useState(5);
  const [xp] = useState(1250);
  const [hearts] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Daily Question Modal States
  const searchParams = useSearchParams();
  const [dailyQuestion, setDailyQuestion] = useState<{
    id: number;
    text: string;
    options: { id: number; text: string }[];
  } | null>(null);
  const [dailyQuestionLoading, setDailyQuestionLoading] = useState(false);
  const [dailySelectedOption, setDailySelectedOption] = useState<string | null>(
    null
  );
  const [dailyFeedback, setDailyFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
    alreadyAnswered?: boolean;
  } | null>(null);
  const [dailySubmitting, setDailySubmitting] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const loadDailyQuestion = async (qId: number) => {
    setDailyQuestionLoading(true);
    setShowDailyModal(true);
    try {
      const res = await getQuestionForPlayerAction(qId);
      if (res.success && res.data) {
        setDailyQuestion(res.data);

        // Check if there's a pre-selected option in search params
        const selectOptionParam = searchParams.get("selectOption");
        if (selectOptionParam !== null) {
          handleDailySubmit(qId, selectOptionParam);
        }
      } else {
        toast.error(res.error || "Impossible de charger la question.");
        setShowDailyModal(false);
      }
    } catch {
      toast.error("Erreur lors du chargement de la question.");
      setShowDailyModal(false);
    } finally {
      setDailyQuestionLoading(false);
    }
  };

  interface DailyStats {
    total: number;
    correct: number;
    successRate: number;
    tagStats: {
      tag: string;
      total: number;
      correct: number;
      rate: number;
    }[];
  }

  const [stats, setStats] = useState<DailyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await getDailyQuestionStatsAction();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // Ignored
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDailySubmit = async (qId: number, optionIndex: string) => {
    setDailySelectedOption(optionIndex);
    setDailySubmitting(true);
    try {
      const res = await submitDailyQuestionAnswerAction({
        questionId: qId,
        optionIndex,
      });
      if (res.success && res.data) {
        setDailyFeedback(res.data);
        if (res.data.isCorrect && !res.data.alreadyAnswered) {
          playSound("success");
          toast.success("Bonne réponse !");
        } else if (!res.data.isCorrect && !res.data.alreadyAnswered) {
          toast.error("Mauvaise réponse. Révisez le concept !");
        }
        fetchStats();
      } else {
        toast.error(res.error || "Erreur lors de la validation.");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setDailySubmitting(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const questionIdParam = searchParams.get("dailyQuestionId");
    if (questionIdParam) {
      const qId = parseInt(questionIdParam, 10);
      if (!isNaN(qId)) {
        loadDailyQuestion(qId);
      }
    }
  }, [searchParams, mounted]);

  // Load onboarding state and protect against SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
    async function loadStatus() {
      try {
        const res = await getPlayerOnboardingStatusAction();
        if (res.success && res.data) {
          setOnboardingCompleted(res.data.completed);
          setExperience(res.data.experience);
          setObjective(res.data.objective);
          setExpectation(res.data.expectation);
        }
      } finally {
        setLoadingOnboarding(false);
      }
    }
    loadStatus();
    fetchStats();
  }, []);

  const handleFinishOnboarding = async () => {
    try {
      const res = await savePlayerOnboardingAction({
        experience,
        objective,
        expectation,
      });
      if (res.success) {
        setOnboardingCompleted(true);
        playSound("success");
        toast.success("Profil d'apprentissage configuré avec succès !");
      } else {
        toast.error(
          res.error || "Une erreur est survenue lors de la configuration."
        );
      }
    } catch (error) {
      logger.error(
        "Erreur inattendue durant la configuration de l'onboarding :",
        error
      );
      toast.error("Une erreur inattendue est survenue.");
    }
  };

  const resetOnboarding = async () => {
    const res = await resetPlayerOnboardingAction();
    if (res.success) {
      setOnboardingCompleted(false);
      setExperience("");
      setObjective("");
      setExpectation("");
    }
  };

  const playSound = (type: "click" | "success" | "locked") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "locked") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch (e) {
      logger.warn("Web Audio failed to load:", e);
    }
  };

  const levels: LevelNode[] = [
    {
      id: "1",
      title: "Hémorragies Externes",
      subtitle: "Niveau 1 - Quiz",
      description: "Compresser et alerter face à un saignement important.",
      type: "quiz",
      status: "completed",
      xpReward: 100,
      themeColor:
        "from-green-400 to-green-500 border-green-600 shadow-green-200",
    },
    {
      id: "2",
      title: "Le Garrot de Secours",
      subtitle: "Niveau 2 - Fiche Mémo",
      description: "Apprends à poser un garrot tourniquet de manière conforme.",
      type: "card",
      status: "completed",
      xpReward: 50,
      themeColor: "from-blue-400 to-blue-500 border-blue-600 shadow-blue-200",
    },
    {
      id: "3",
      title: "Victime Inconsciente",
      subtitle: "Niveau 3 - Scénario SNV",
      description: "Libération des Voies Aériennes (LVA) et PLS.",
      type: "snv",
      status: "current",
      xpReward: 150,
      themeColor:
        "from-amber-400 to-amber-500 border-amber-600 shadow-amber-200",
    },
    {
      id: "4",
      title: "Arrêt Cardiaque",
      subtitle: "Niveau 4 - Quiz",
      description: "Massage cardiaque et utilisation du DAE.",
      type: "quiz",
      status: "locked",
      xpReward: 200,
      themeColor:
        "from-purple-400 to-purple-500 border-purple-600 shadow-purple-200",
    },
    {
      id: "5",
      title: "Obstructions Aiguës",
      subtitle: "Niveau 5 - Scénario SNV",
      description: "Claques dans le dos et compressions abdominales.",
      type: "snv",
      status: "locked",
      xpReward: 150,
      themeColor: "from-rose-400 to-rose-500 border-rose-600 shadow-rose-200",
    },
    {
      id: "6",
      title: "Malaises & Alertes",
      subtitle: "Niveau 6 - Fiche Mémo",
      description: "Reconnaître l'AVC, l'infarctus et transmettre l'alerte.",
      type: "card",
      status: "locked",
      xpReward: 50,
      themeColor: "from-cyan-400 to-cyan-500 border-cyan-600 shadow-cyan-200",
    },
  ];

  const leaderboard = [
    { name: "Thomas (Formateur)", xp: 1850, avatar: "👨‍🏫", current: false },
    { name: "Toi", xp: 1250, avatar: "⚡", current: true },
    { name: "Sarah B.", xp: 980, avatar: "👩‍⚕️", current: false },
    { name: "Lucas M.", xp: 850, avatar: "👷", current: false },
    { name: "Camille D.", xp: 620, avatar: "👩‍🚒", current: false },
  ];

  const dailyQuests = [
    {
      text: "Réalise un sans-faute sur un quiz",
      progress: 0,
      target: 1,
      xp: 100,
    },
    {
      text: "Complète 1 scénario SNV",
      progress: 1,
      target: 1,
      xp: 150,
      completed: true,
    },
    { text: "Réviser 5 cartes mémo", progress: 2, target: 5, xp: 50 },
  ];

  if (!mounted || loadingOnboarding) return null;

  if (!onboardingCompleted) {
    return (
      <PlayerOnboarding
        experience={experience}
        setExperience={setExperience}
        objective={objective}
        setObjective={setObjective}
        expectation={expectation}
        setExpectation={setExpectation}
        onFinish={handleFinishOnboarding}
        playSound={playSound}
      />
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-6 md:py-10">
      <PlayerStatsBanner
        streak={streak}
        xp={xp}
        hearts={hearts}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Column 1: Mascot, Stats, Quests, Subscription */}
        <div className="space-y-6 lg:col-span-8">
          <div className="grid gap-6 md:grid-cols-2">
            <MascotWidget onResetOnboarding={resetOnboarding} />
            <DailyStatsWidget stats={stats} loading={statsLoading} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section
              className="space-y-4 rounded-3xl border-2 border-gray-100 bg-white p-6 shadow-sm"
              aria-labelledby="quests-title-left"
            >
              <h2
                id="quests-title-left"
                className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-900 uppercase"
              >
                <Trophy className="h-4 w-4 text-yellow-500" />
                Défis quotidiens
              </h2>
              <div className="space-y-4">
                {dailyQuests.map((quest, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "text-xs font-bold",
                          quest.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        )}
                      >
                        {quest.text}
                      </span>
                      <span className="shrink-0 text-[10px] font-black text-yellow-600">
                        +{quest.xp} XP
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          style={{
                            width: `${(quest.progress / quest.target) * 100}%`,
                          }}
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            quest.completed ? "bg-emerald-500" : "bg-blue-600"
                          )}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-gray-500">
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <SubscriptionWidget playSound={playSound} />
          </div>
        </div>

        {/* Column 2: Leaderboard & Boutique */}
        <aside className="space-y-6 lg:col-span-4">
          <LeaderboardWidget leaderboard={leaderboard} />
          <BoutiqueWidget />
        </aside>
      </div>

      <Dialog
        open={showDailyModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowDailyModal(false);
            setDailyQuestion(null);
            setDailySelectedOption(null);
            setDailyFeedback(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl border-none bg-white p-6 shadow-xl sm:max-w-[500px]">
          {dailyQuestionLoading ? (
            <div className="flex h-60 flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm font-black text-slate-500">
                Chargement de ton défi...
              </p>
            </div>
          ) : dailyQuestion ? (
            <div className="space-y-6">
              <DialogHeader className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Mail className="h-6 w-6" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">
                  Défi Secourisme
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs font-bold tracking-widest text-slate-400 uppercase">
                  Question Unique
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-base leading-snug font-bold text-slate-800">
                  {dailyQuestion.text}
                </p>
              </div>

              <div className="space-y-3">
                {dailyQuestion.options.map((opt, idx) => {
                  const optionId = idx.toString();
                  const isSelected = dailySelectedOption === optionId;
                  const showCorrect =
                    dailyFeedback && optionId === dailyFeedback.correctAnswer;
                  const showWrong =
                    dailyFeedback && isSelected && !dailyFeedback.isCorrect;

                  return (
                    <button
                      key={opt.id}
                      disabled={dailySubmitting || dailyFeedback !== null}
                      onClick={() =>
                        handleDailySubmit(dailyQuestion.id, optionId)
                      }
                      className={cn(
                        "w-full cursor-pointer rounded-2xl border-2 p-4 text-left text-sm font-bold transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none",
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-100 bg-white text-slate-700 hover:border-blue-300",
                        showCorrect &&
                          "border-emerald-500 bg-emerald-50 text-emerald-800 hover:border-emerald-500",
                        showWrong &&
                          "border-rose-500 bg-rose-50 text-rose-800 hover:border-rose-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-500",
                            showCorrect && "bg-emerald-500 text-white",
                            showWrong && "bg-rose-500 text-white"
                          )}
                        >
                          {showCorrect ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : showWrong ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {dailyFeedback && (
                <div
                  className={cn(
                    "animate-fade-in rounded-2xl border p-4 transition-all duration-350",
                    dailyFeedback.isCorrect
                      ? "border-emerald-100 bg-emerald-50/50 text-emerald-800"
                      : "text-rose-850 border-rose-100 bg-rose-50/50"
                  )}
                >
                  <p className="mb-1 text-xs font-black tracking-wider uppercase">
                    {dailyFeedback.isCorrect ? "Bien joué !" : "Oups !"}
                  </p>
                  <p className="text-xs leading-relaxed font-bold">
                    {dailyFeedback.explanation || "Pas d'explication fournie."}
                  </p>
                </div>
              )}

              {dailyFeedback && (
                <Button
                  onClick={() => {
                    setShowDailyModal(false);
                    setDailyQuestion(null);
                    setDailySelectedOption(null);
                    setDailyFeedback(null);
                  }}
                  className="w-full rounded-2xl bg-slate-900 py-6 text-sm font-black text-white shadow-sm hover:bg-slate-800"
                >
                  Fermer
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
