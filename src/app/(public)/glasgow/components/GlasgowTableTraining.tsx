"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shuffle,
  RotateCcw,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  Activity,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { secureShuffle } from "@/lib/crypto";
import type {
  GlasgowData,
  GameMode,
  UserAnswers,
  ScoreResult,
} from "../interfaces/GlasgowData";

export function GlasgowTableTraining({ className }: { className?: string }) {
  // Official French first aid (DGSCGC / SUAP) terms for Glasgow scale
  const glasgowData: GlasgowData = useMemo<GlasgowData>(
    () => ({
      oculaire: [
        { score: 1, description: "Aucune" },
        { score: 2, description: "À la douleur" },
        { score: 3, description: "À la demande" },
        { score: 4, description: "Spontanée" },
      ],
      verbale: [
        { score: 1, description: "Aucune" },
        { score: 2, description: "Incompréhensible" },
        { score: 3, description: "Inappropriée" },
        { score: 4, description: "Confuse" },
        { score: 5, description: "Orientée" },
      ],
      motrice: [
        { score: 1, description: "Aucune" },
        { score: 2, description: "Extension anormale" },
        { score: 3, description: "Flexion anormale" },
        { score: 4, description: "Évitement / Retrait" },
        { score: 5, description: "Localise la douleur" },
        { score: 6, description: "À l'ordre" },
      ],
    }),
    []
  );

  const [hiddenCells, setHiddenCells] = useState<Set<string>>(new Set());
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>("mixed");
  const [numCellsToHide, setNumCellsToHide] = useState<number>(6);

  const getMaxCells = useCallback((): number => {
    const totalRows = 15; // 4 + 5 + 6 = 15 rows
    if (gameMode === "scores" || gameMode === "descriptions") {
      return totalRows;
    }
    return totalRows * 2;
  }, [gameMode]);

  const generateHiddenCells = useCallback((): void => {
    const allCells: string[] = [];

    (Object.keys(glasgowData) as Array<keyof GlasgowData>).forEach(
      (category) => {
        const items = glasgowData[category];
        items.forEach((item) => {
          allCells.push(`${category}-${item.score}-score`);
          allCells.push(`${category}-${item.score}-description`);
        });
      }
    );

    let availableCells = allCells;
    if (gameMode === "scores") {
      availableCells = allCells.filter((cell) => cell.endsWith("-score"));
    } else if (gameMode === "descriptions") {
      availableCells = allCells.filter((cell) => cell.endsWith("-description"));
    }

    const shuffled = secureShuffle(availableCells);
    const actualNumToHide = Math.min(numCellsToHide, availableCells.length);
    const selected = shuffled.slice(0, actualNumToHide);

    setHiddenCells(new Set(selected));
    setUserAnswers({});
    setShowResults(false);
  }, [gameMode, numCellsToHide, glasgowData]);

  useEffect(() => {
    const maxCells = getMaxCells();
    if (numCellsToHide > maxCells) {
      setNumCellsToHide(maxCells);
    }
  }, [gameMode, numCellsToHide, getMaxCells]);

  useEffect(() => {
    generateHiddenCells();
  }, [generateHiddenCells]);

  const handleAnswerChange = (cellId: string, value: string): void => {
    setUserAnswers((prev) => ({
      ...prev,
      [cellId]: value,
    }));
  };

  const checkAnswers = (): void => {
    setShowResults(true);
  };

  const getCorrectAnswer = useCallback(
    (cellId: string): string => {
      const [category, scoreStr, type] = cellId.split("-");
      const score = parseInt(scoreStr);
      const item = glasgowData[category as keyof GlasgowData].find(
        (i) => i.score === score
      );

      if (!item) return "";
      return type === "score" ? score.toString() : item.description;
    },
    [glasgowData]
  );

  const isCorrect = useCallback(
    (cellId: string): boolean | null => {
      if (!showResults) return null;
      const userAnswer = userAnswers[cellId];
      const correctAnswer = getCorrectAnswer(cellId);

      if (!userAnswer) return false;

      if (cellId.endsWith("-score")) {
        return parseInt(userAnswer) === parseInt(correctAnswer);
      } else {
        return (
          userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
        );
      }
    },
    [showResults, userAnswers, getCorrectAnswer]
  );

  const calculateScore = useCallback((): ScoreResult => {
    let correct = 0;
    const total = hiddenCells.size;

    hiddenCells.forEach((cellId) => {
      if (isCorrect(cellId)) correct++;
    });

    return { correct, total };
  }, [hiddenCells, isCorrect]);

  const renderCell = (
    category: string,
    item: { score: number; description: string },
    type: "score" | "description"
  ): React.ReactNode => {
    const cellId = `${category}-${item.score}-${type}`;
    const isHidden = hiddenCells.has(cellId);
    const correct = isCorrect(cellId);

    if (!isHidden) {
      return (
        <td
          key={cellId}
          className="border border-gray-100 bg-gray-50/50 px-4 py-3 text-center text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900/35 dark:text-gray-300"
        >
          {type === "score" ? item.score : item.description}
        </td>
      );
    }

    return (
      <td
        key={cellId}
        className={cn(
          "border border-gray-200 p-2 text-center transition-all duration-300 dark:border-gray-800",
          showResults
            ? correct
              ? "border-green-400 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
              : "border-rose-400 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20"
            : "bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/5"
        )}
      >
        <div className="flex w-full flex-col items-center justify-center gap-1.5">
          {type === "score" ? (
            <input
              type="number"
              min="1"
              max="6"
              value={userAnswers[cellId] || ""}
              onChange={(e) => handleAnswerChange(cellId, e.target.value)}
              disabled={showResults}
              aria-label={`Score pour ${category} description ${item.description}`}
              className="h-9 w-14 rounded-lg border border-gray-200 bg-white text-center text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="?"
            />
          ) : (
            <input
              type="text"
              value={userAnswers[cellId] || ""}
              onChange={(e) => handleAnswerChange(cellId, e.target.value)}
              disabled={showResults}
              aria-label={`Description pour ${category} score ${item.score}`}
              className="h-9 w-full max-w-[200px] rounded-lg border border-gray-200 bg-white px-2 text-center text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Écrivez..."
            />
          )}

          {showResults && (
            <div className="flex items-center justify-center">
              {correct ? (
                <CheckCircle
                  size={16}
                  className="animate-bounce text-green-600 dark:text-green-400"
                />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <XCircle
                    size={16}
                    className="text-rose-600 dark:text-rose-400"
                  />
                  <span className="mt-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                    {getCorrectAnswer(cellId)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    );
  };

  const getCategoryIcon = (category: string): React.ReactNode => {
    switch (category) {
      case "oculaire":
        return <Eye size={18} className="text-blue-600" />;
      case "verbale":
        return <MessageCircle size={18} className="text-green-600" />;
      case "motrice":
        return <Activity size={18} className="text-rose-600" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case "oculaire":
        return "bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 border-blue-100 dark:border-blue-900";
      case "verbale":
        return "bg-green-50/50 dark:bg-green-950/20 text-green-900 dark:text-green-200 border-green-100 dark:border-green-900";
      case "motrice":
        return "bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 border-rose-100 dark:border-rose-900";
      default:
        return "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white";
    }
  };

  const score = useMemo(() => {
    if (showResults) return calculateScore();
    return { correct: 0, total: hiddenCells.size };
  }, [showResults, calculateScore, hiddenCells.size]);

  return (
    <div
      className={cn(
        "mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900",
        className
      )}
    >
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Activez votre mémorisation
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Complétez les cases masquées du tableau pour tester vos connaissances.
        </p>
      </div>

      {/* Paramètres & Contrôles */}
      <div className="mb-6 grid grid-cols-1 gap-4 border-b border-gray-100 pb-6 md:grid-cols-2 lg:grid-cols-3 dark:border-gray-800">
        {/* Mode de Jeu */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="select-game-mode"
            className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500"
          >
            Mode d'entraînement
          </label>
          <select
            id="select-game-mode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as GameMode)}
            className="rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none dark:border-gray-700 dark:text-white"
          >
            <option value="mixed">Tout deviner (Aléatoire)</option>
            <option value="scores">Scores uniquement</option>
            <option value="descriptions">Descriptions uniquement</option>
          </select>
        </div>

        {/* Curseurs de volume */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="range-cells-to-hide"
              className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500"
            >
              Nombre de défis
            </label>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {numCellsToHide} / {getMaxCells()} cases
            </span>
          </div>
          <input
            id="range-cells-to-hide"
            type="range"
            min="1"
            max={getMaxCells()}
            value={numCellsToHide}
            onChange={(e) => setNumCellsToHide(parseInt(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-800"
          />
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-end justify-start gap-2 md:col-span-2 md:justify-end lg:col-span-1">
          <Button
            onClick={generateHiddenCells}
            className="flex h-10 items-center gap-2 px-4 text-xs font-semibold"
            variant="outline"
          >
            <Shuffle size={14} />
            Mélanger
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setUserAnswers({});
              setShowResults(false);
            }}
            className="flex h-10 items-center gap-2 px-4 text-xs font-semibold"
          >
            <RotateCcw size={14} />
            Effacer
          </Button>
        </div>
      </div>

      {/* Tableau interactif */}
      <div className="border-gray-150 mb-6 overflow-x-auto rounded-2xl border dark:border-gray-800">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-gray-150 border-b bg-gray-50/75 dark:border-gray-800 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                Catégorie
              </th>
              <th className="w-24 px-4 py-3 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                Description clinique
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Oculaire */}
            {glasgowData.oculaire.map((item, index) => (
              <tr
                key={`oculaire-${item.score}`}
                className="dark:border-gray-850 border-b border-gray-100 hover:bg-gray-50/20 dark:hover:bg-gray-900/10"
              >
                {index === 0 && (
                  <td
                    rowSpan={4}
                    className={cn(
                      "border-r border-gray-100 px-4 py-6 text-center text-xs font-bold tracking-wider uppercase dark:border-gray-800",
                      getCategoryColor("oculaire")
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      {getCategoryIcon("oculaire")}
                      <span>Yeux (Y)</span>
                    </div>
                  </td>
                )}
                {renderCell("oculaire", item, "score")}
                {renderCell("oculaire", item, "description")}
              </tr>
            ))}

            {/* Verbale */}
            {glasgowData.verbale.map((item, index) => (
              <tr
                key={`verbale-${item.score}`}
                className="dark:border-gray-850 border-b border-gray-100 hover:bg-gray-50/20 dark:hover:bg-gray-900/10"
              >
                {index === 0 && (
                  <td
                    rowSpan={5}
                    className={cn(
                      "border-r border-gray-100 px-4 py-6 text-center text-xs font-bold tracking-wider uppercase dark:border-gray-800",
                      getCategoryColor("verbale")
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      {getCategoryIcon("verbale")}
                      <span>Voix (V)</span>
                    </div>
                  </td>
                )}
                {renderCell("verbale", item, "score")}
                {renderCell("verbale", item, "description")}
              </tr>
            ))}

            {/* Motrice */}
            {glasgowData.motrice.map((item, index) => (
              <tr
                key={`motrice-${item.score}`}
                className="dark:border-gray-850 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/20 dark:hover:bg-gray-900/10"
              >
                {index === 0 && (
                  <td
                    rowSpan={6}
                    className={cn(
                      "border-r border-gray-100 px-4 py-6 text-center text-xs font-bold tracking-wider uppercase dark:border-gray-800",
                      getCategoryColor("motrice")
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      {getCategoryIcon("motrice")}
                      <span>Mouvement (M)</span>
                    </div>
                  </td>
                )}
                {renderCell("motrice", item, "score")}
                {renderCell("motrice", item, "description")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation */}
      <div className="mt-8 flex flex-col items-center justify-center">
        {!showResults ? (
          <Button
            onClick={checkAnswers}
            disabled={Object.keys(userAnswers).length === 0}
            className="h-12 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
          >
            Vérifier mes réponses
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50/50 p-5 text-center dark:border-gray-800 dark:bg-gray-900/50"
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                Vos résultats
              </h4>
            </div>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {score.correct} / {score.total}
              <span className="ml-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                ({Math.round((score.correct / score.total) * 100)}% de réussite)
              </span>
            </p>

            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              {score.correct === score.total
                ? "Incroyable ! C'est un sans-faute parfait !"
                : score.correct >= score.total * 0.8
                  ? "Excellent travail ! Presque toutes les réponses sont correctes."
                  : score.correct >= score.total * 0.5
                    ? "Bon début ! Révisez les quelques erreurs et réessayez."
                    : "Prenez le temps d'observer le tableau complet et tentez de nouveau."}
            </p>

            <Button
              onClick={generateHiddenCells}
              className="mt-4 h-10 w-full rounded-xl bg-gray-900 text-xs font-bold text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Relever un autre défi
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
