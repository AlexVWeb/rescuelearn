"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Award,
  Info,
  AlertTriangle,
} from "lucide-react";
import { SNVScenario } from "../interfaces/SNV";
import { snvService } from "../services/snvService";
import { motion } from "framer-motion";
import { QuizTimer } from "../../quiz/components/QuizTimer";
import { SnvResults } from "../components/SnvResults";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { secureRandom } from "@/lib/crypto";

interface PageParams {
  id: string;
}

const SNVGame = ({ params }: { params: Promise<PageParams> }) => {
  const [scenario, setScenario] = useState<SNVScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVictimIndex, setCurrentVictimIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [gameOver, setGameOver] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [victimOrder, setVictimOrder] = useState<number[]>([]);
  const [isTimeCritical, setIsTimeCritical] = useState(false);
  const [performance, setPerformance] = useState({ stars: 0, message: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") as
    | "easy"
    | "medium"
    | "hard";
  const isRandomMode = searchParams.get("random") === "true";
  const timeLimit = searchParams.get("time")
    ? parseInt(searchParams.get("time")!)
    : 60;
  const { id: scenarioId } = React.use(params);
  const router = useRouter();

  useEffect(() => {
    const header = document.body.getElementsByTagName("header")[0];
    const footer = document.body.getElementsByTagName("footer")[0];
    if (header && footer) {
      header.classList.add("hidden");
      footer.classList.add("hidden");
    }
    return () => {
      if (header) {
        header.classList.remove("hidden");
      }
      if (footer) {
        footer.classList.remove("hidden");
      }
    };
  }, []);

  const handleColorSelect = useCallback(
    (colorIndex: number) => {
      if (gameOver || !scenario?.victimes) return;

      const currentVictim = scenario.victimes[victimOrder[currentVictimIndex]];
      if (!currentVictim) return;

      setSelectedColor(colorIndex);
      const isCorrect = colorIndex === currentVictim.correctAnswer;

      let newScore = score;
      if (isCorrect) {
        newScore = score + 1;
        setScore(newScore);
      }

      setShowExplanation(true);

      setTimeout(() => {
        if (!scenario.victimes) return;

        if (currentVictimIndex < scenario.victimes.length - 1) {
          setCurrentVictimIndex((prev) => prev + 1);
          setSelectedColor(null);
          setShowExplanation(false);
          setTimeLeft(getTimeLimit(difficulty, timeLimit));
          setIsTimeCritical(false);
        } else {
          setGameOver(true);
          const percentage = (newScore / scenario.victimes.length) * 100;
          let stars = 0;
          let message = "";

          if (percentage >= 90) {
            stars = 3;
            message =
              "Excellent ! Vous maîtrisez parfaitement la classification des victimes.";
          } else if (percentage >= 70) {
            stars = 2;
            message =
              "Bien ! Vous avez une bonne compréhension de la classification.";
          } else if (percentage >= 50) {
            stars = 1;
            message = "Pas mal, mais vous devriez réviser certains cas.";
          } else {
            stars = 0;
            message =
              "Vous devez approfondir vos connaissances en classification des victimes.";
          }

          setPerformance({ stars, message });
        }
      }, 2000);
    },
    [
      gameOver,
      scenario,
      victimOrder,
      currentVictimIndex,
      score,
      difficulty,
      timeLimit,
    ]
  );

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const data = await snvService.getScenarioById(parseInt(scenarioId));

        if (!data || !data.victimes || data.victimes.length === 0) {
          throw new Error("Aucune victime trouvée dans le scénario");
        }

        setScenario(data);
        setTimeLeft(getTimeLimit(difficulty, timeLimit));
        setGameOver(false);
        setSelectedColor(null);
        setShowExplanation(false);

        const order = Array.from({ length: data.victimes.length }, (_, i) => i);
        if (isRandomMode) {
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(secureRandom() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
        }
        setVictimOrder(order);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Une erreur est survenue"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId, difficulty, isRandomMode, timeLimit]);

  useEffect(() => {
    if (!gameOver && timeLeft > 0 && !showExplanation) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            setGameOver(true);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, gameOver, difficulty, showExplanation, handleColorSelect]);

  const getTimeLimit = (difficulty: string, timeLimit: number) => {
    switch (difficulty) {
      case "easy":
        return 999999; // Un grand nombre pour simuler un temps illimité
      case "medium":
        return timeLimit; // Utilise le temps sélectionné
      case "hard":
        return 10; // 10 secondes fixes
      default:
        return 999999;
    }
  };

  const restartScenario = () => {
    setGameOver(false);
    setCurrentVictimIndex(0);
    setSelectedColor(null);
    setScore(0);
    setTimeLeft(getTimeLimit(difficulty, timeLimit));
    setIsTimeCritical(false);
    setShowExplanation(false);
  };

  const handleQuit = () => {
    setDialogOpen(false);
    router.push("/snv");
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!scenario || !scenario.victimes) {
    return null;
  }

  const currentVictim = scenario.victimes[victimOrder[currentVictimIndex]];
  const progress = ((currentVictimIndex + 1) / scenario.victimes.length) * 100;
  const colors = [
    { name: "Vert", bg: "bg-green-500", hover: "hover:bg-green-600" },
    { name: "Jaune", bg: "bg-yellow-500", hover: "hover:bg-yellow-600" },
    { name: "Rouge", bg: "bg-red-500", hover: "hover:bg-red-600" },
    { name: "Noir", bg: "bg-gray-900", hover: "hover:bg-gray-800" },
  ];

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-between overflow-hidden bg-gray-50"
      style={{ minHeight: "100vh" }}
    >
      <div className="flex w-full flex-1 flex-col items-center overflow-y-auto px-4 py-6">
        <div className="w-full max-w-4xl">
          <div className="z-10 flex w-full flex-col items-center bg-gray-50 px-2 pt-3 pb-2 sm:flex-row sm:items-end sm:justify-between sm:px-4">
            <div className="flex w-full items-center justify-between sm:justify-start">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="flex cursor-pointer items-center space-x-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-200 hover:shadow">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                    <span>Retour</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-xl border-none bg-white p-6 shadow-lg">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold text-gray-800">
                      Quitter le scénario ?
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-gray-600">
                      Êtes-vous sûr de vouloir quitter ? Votre progression sera
                      perdue.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleQuit}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      Quitter le scénario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex flex-1 items-center justify-center">
                <h1
                  className="mx-2 text-center text-base font-semibold text-gray-800 sm:max-w-none sm:text-xl sm:font-bold"
                  title={scenario?.title}
                >
                  {scenario?.title}
                </h1>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ml-2 rounded-full bg-gray-100 p-1.5 transition-colors hover:bg-gray-200"
                  title="Voir les détails du scénario"
                >
                  <Info className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="w-8 sm:w-12" />
            </div>
            <div className="mt-2 flex w-full flex-col items-center sm:mt-0 sm:flex-row sm:justify-center">
              <div className="h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{
                    width: `${progress}%`,
                    backgroundColor: "#3B82F6",
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="mt-1 text-xs whitespace-nowrap text-gray-600 sm:mt-0 sm:ml-3">
                Victime {currentVictimIndex + 1}/{scenario?.victimes.length}
              </div>
            </div>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 shadow-lg">
              <DialogHeader>
                <DialogTitle className="mb-3 text-xl font-bold text-gray-800">
                  Détails du scénario
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-1 font-semibold text-gray-800">Titre</h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {scenario?.title}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-1 font-semibold text-gray-800">
                    Description
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {scenario?.description}
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-1 font-semibold text-gray-800">
                    Informations
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-gray-600">
                        Niveau : {scenario?.level}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Nombre de victimes :{" "}
                        {scenario?.victimesCount ||
                          scenario?.victimes?.length ||
                          0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {gameOver ? (
            <SnvResults
              score={score}
              totalVictims={scenario?.victimes.length || 0}
              performance={performance}
              onRestart={restartScenario}
              difficulty={difficulty}
            />
          ) : (
            <div className="mb-4 rounded-xl bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {difficulty !== "easy" && (
                    <QuizTimer
                      timeLeft={timeLeft}
                      totalTime={getTimeLimit(difficulty, timeLimit)}
                      isTimeCritical={isTimeCritical}
                    />
                  )}
                  {difficulty !== "hard" && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-gray-700">
                        {score}/{currentVictimIndex}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <h2 className="mb-2 text-base font-semibold text-gray-800">
                  Description de la victime
                </h2>
                <p className="text-sm text-gray-700">
                  {currentVictim?.description}
                </p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                {colors.map((color, index) => {
                  const isSelected = selectedColor === index;
                  const isCorrect = index === currentVictim?.correctAnswer;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorSelect(index)}
                      disabled={gameOver || showExplanation}
                      className={` ${color.bg} ${color.hover} flex items-center justify-center rounded-lg px-4 py-3 text-sm text-white transition-colors ${isSelected ? (isCorrect ? "ring-2 ring-green-500" : "ring-2 ring-red-500") : ""} ${gameOver || showExplanation ? "cursor-not-allowed opacity-50" : "cursor-pointer"} `}
                    >
                      {color.name}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start space-x-2">
                    {selectedColor === currentVictim?.correctAnswer ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="mb-1 text-sm font-medium text-gray-700">
                        {selectedColor === currentVictim?.correctAnswer
                          ? "Bonne réponse !"
                          : "Mauvaise réponse"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {currentVictim?.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default SNVGame;
