"use client";

import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { PlayerStatsBanner } from "./components/PlayerStatsBanner";
import { PlayerOnboarding } from "./components/PlayerOnboarding";
import { MascotWidget } from "./components/MascotWidget";
import { LeaderboardWidget } from "./components/LeaderboardWidget";
import { BoutiqueWidget } from "./components/BoutiqueWidget";
import { SubscriptionWidget } from "./components/SubscriptionWidget";
import { InDevelopmentBadge } from "./components/InDevelopmentBadge";
import {
  getPlayerStatsAction,
  getProgressionStatsAction,
} from "@/app/actions/progression-player-actions";
import { useSearchParams } from "next/navigation";
import {
  getQuestionForPlayerAction,
  submitDailyQuestionAnswerAction,
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
import { usePlayerSound } from "./hooks/usePlayerSound";
import { usePlayerOnboarding } from "./hooks/usePlayerOnboarding";
import { usePlayerModules } from "./components/PlayerModulesProvider";
import { PlayerModuleKey } from "@/types/player-modules";

export default function PlayerPage() {
  const { soundEnabled, toggleSound, playSound } = usePlayerSound();
  const modules = usePlayerModules();
  const showMascot = modules[PlayerModuleKey.MASCOT];
  const showDailyStats = modules[PlayerModuleKey.DAILY_STATS];
  const showDailyQuests = modules[PlayerModuleKey.DAILY_QUESTS];
  const showSubscription = modules[PlayerModuleKey.SUBSCRIPTION];
  const showLeaderboard = modules[PlayerModuleKey.LEADERBOARD];
  const showBoutique = modules[PlayerModuleKey.BOUTIQUE];
  const showAside = showLeaderboard || showBoutique;

  // Game States
  const [playerStats, setPlayerStats] = useState({
    xp: 0,
    hearts: 0,
    streak: 0,
  });

  const fetchPlayerStats = async () => {
    const res = await getPlayerStatsAction();
    if (res.success && res.data) {
      setPlayerStats(res.data);
    }
  };

  const onboarding = usePlayerOnboarding({
    onCompleted: fetchPlayerStats,
    onFinishSuccess: () => playSound("success"),
  });

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

  const dailyQuestionIdParam = searchParams.get("dailyQuestionId");
  const dailyQuestionId = dailyQuestionIdParam
    ? parseInt(dailyQuestionIdParam, 10)
    : NaN;

  // Ouvre la modale dès le rendu où le paramètre apparaît ; le chargement se fait dans l'effet.
  const [prevSearchParams, setPrevSearchParams] = useState<
    typeof searchParams | null
  >(null);
  if (searchParams !== prevSearchParams) {
    setPrevSearchParams(searchParams);
    if (!isNaN(dailyQuestionId)) {
      setDailyQuestionLoading(true);
      setShowDailyModal(true);
    }
  }

  type ProgressionStats = NonNullable<
    Awaited<ReturnType<typeof getProgressionStatsAction>>["data"]
  >;

  const [stats, setStats] = useState<ProgressionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
    const loadDailyQuestion = async (qId: number) => {
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

    if (!isNaN(dailyQuestionId)) {
      loadDailyQuestion(dailyQuestionId);
    }
  }, [searchParams, dailyQuestionId]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getProgressionStatsAction();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        // Ignored
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const leaderboard = [
    { name: "Thomas (Formateur)", xp: 1850, avatar: "👨‍🏫", current: false },
    { name: "Toi", xp: playerStats.xp, avatar: "⚡", current: true },
    { name: "Sarah B.", xp: 980, avatar: "👩‍⚕️", current: false },
    { name: "Lucas M.", xp: 850, avatar: "👷", current: false },
    { name: "Camille D.", xp: 620, avatar: "👩‍🚒", current: false },
  ].sort((a, b) => b.xp - a.xp);

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

  if (onboarding.loadingOnboarding) return null;

  if (!onboarding.onboardingCompleted) {
    return (
      <PlayerOnboarding
        experience={onboarding.experience}
        setExperience={onboarding.setExperience}
        objective={onboarding.objective}
        setObjective={onboarding.setObjective}
        expectation={onboarding.expectation}
        setExpectation={onboarding.setExpectation}
        onFinish={onboarding.finishOnboarding}
        playSound={playSound}
      />
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-6 md:py-10">
      <PlayerStatsBanner
        levelProgress={stats}
        streak={playerStats.streak}
        xp={playerStats.xp}
        hearts={playerStats.hearts}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Column 1: Mascot, Stats, Quests, Subscription */}
        <div
          className={cn(
            "space-y-6",
            showAside ? "lg:col-span-8" : "lg:col-span-12"
          )}
        >
          {(showMascot || showDailyStats) && (
            <div className="grid gap-6 md:grid-cols-2">
              {showMascot && (
                <MascotWidget onResetOnboarding={onboarding.resetOnboarding} />
              )}
              {showDailyStats && (
                <DailyStatsWidget stats={stats} loading={statsLoading} />
              )}
            </div>
          )}

          {(showDailyQuests || showSubscription) && (
            <div className="grid gap-6 md:grid-cols-2">
              {showDailyQuests && (
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
                    <InDevelopmentBadge />
                  </h2>
                  <div
                    className="pointer-events-none space-y-4 opacity-50 select-none"
                    aria-hidden="true"
                  >
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
                                quest.completed
                                  ? "bg-emerald-500"
                                  : "bg-blue-600"
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
              )}

              {showSubscription && <SubscriptionWidget playSound={playSound} />}
            </div>
          )}
        </div>

        {/* Column 2: Leaderboard & Boutique */}
        {showAside && (
          <aside className="space-y-6 lg:col-span-4">
            {showLeaderboard && <LeaderboardWidget leaderboard={leaderboard} />}
            {showBoutique && <BoutiqueWidget />}
          </aside>
        )}
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
                      : "border-rose-100 bg-rose-50/50 text-rose-800"
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
