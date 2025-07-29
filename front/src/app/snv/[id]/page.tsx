'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ChevronRight, Award, Info, AlertTriangle } from 'lucide-react';
import { SNVScenario } from '../interfaces/SNV';
import { snvService } from '../services/snvService';
import { motion } from 'framer-motion';
import { QuizTimer } from '../../quiz/components/QuizTimer';
import { SnvResults } from '../components/SnvResults';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  const [performance, setPerformance] = useState({ stars: 0, message: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard';
  const isRandomMode = searchParams.get('random') === 'true';
  const timeLimit = searchParams.get('time') ? parseInt(searchParams.get('time')!) : 60;
  const { id: scenarioId } = React.use(params);
  const router = useRouter();

  useEffect(() => {
    const header = document.body.getElementsByTagName('header')[0];
    const footer = document.body.getElementsByTagName('footer')[0];
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

  const handleColorSelect = useCallback((colorIndex: number) => {
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
        setCurrentVictimIndex(prev => prev + 1);
        setSelectedColor(null);
        setShowExplanation(false);
        setTimeLeft(getTimeLimit(difficulty, timeLimit));
        setIsTimeCritical(false);
      } else {
        setGameOver(true);
        const percentage = (newScore / scenario.victimes.length) * 100;
        let stars = 0;
        let message = '';

        if (percentage >= 90) {
          stars = 3;
          message = "Excellent ! Vous maîtrisez parfaitement la classification des victimes.";
        } else if (percentage >= 70) {
          stars = 2;
          message = "Bien ! Vous avez une bonne compréhension de la classification.";
        } else if (percentage >= 50) {
          stars = 1;
          message = "Pas mal, mais vous devriez réviser certains cas.";
        } else {
          stars = 0;
          message = "Vous devez approfondir vos connaissances en classification des victimes.";
        }

        setPerformance({ stars, message });
      }
    }, 2000);
  }, [gameOver, scenario, victimOrder, currentVictimIndex, score, difficulty, timeLimit]);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const data = await snvService.getScenarioById(parseInt(scenarioId));

        if (!data || !data.victimes || data.victimes.length === 0) {
          throw new Error('Aucune victime trouvée dans le scénario');
        }

        setScenario(data);
        setTimeLeft(getTimeLimit(difficulty, timeLimit));
        setGameOver(false);
        setSelectedColor(null);
        setShowExplanation(false);

        const order = Array.from({ length: data.victimes.length }, (_, i) => i);
        if (isRandomMode) {
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
        }
        setVictimOrder(order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      case 'easy':
        return 999999; // Un grand nombre pour simuler un temps illimité
      case 'medium':
        return timeLimit; // Utilise le temps sélectionné
      case 'hard':
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
    router.push('/snv');
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
    { name: 'Vert', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
    { name: 'Jaune', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
    { name: 'Rouge', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
    { name: 'Noir', bg: 'bg-gray-900', hover: 'hover:bg-gray-800' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between bg-gray-50 overflow-hidden" style={{ minHeight: '100vh' }}>
      <div className="w-full flex-1 flex flex-col items-center px-4 py-6 overflow-y-auto">
        <div className="w-full max-w-4xl">
          <div className="w-full flex flex-col items-center px-2 pt-3 pb-2 bg-gray-50 z-10 sm:flex-row sm:justify-between sm:items-end sm:px-4">
            <div className="w-full flex items-center justify-between sm:justify-start">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-full transition-all duration-200 shadow-sm hover:shadow cursor-pointer text-sm"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Retour</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-white rounded-xl shadow-lg border-none p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold text-gray-800">Quitter le scénario ?</DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">
                      Êtes-vous sûr de vouloir quitter ? Votre progression sera perdue.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleQuit}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Quitter le scénario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex-1 flex items-center justify-center">
                <h1
                  className="text-base font-semibold text-gray-800 text-center mx-2 sm:text-xl sm:font-bold sm:max-w-none"
                  title={scenario?.title}
                >
                  {scenario?.title}
                </h1>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="ml-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Voir les détails du scénario"
                >
                  <Info className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="w-8 sm:w-12" />
            </div>
            <div className="w-full flex flex-col items-center mt-2 sm:mt-0 sm:flex-row sm:justify-center">
              <div className="h-2 w-full max-w-[220px] bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ width: `${progress}%`, backgroundColor: '#3B82F6' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1 sm:mt-0 sm:ml-3 whitespace-nowrap">
                Victime {currentVictimIndex + 1}/{scenario?.victimes.length}
              </div>
            </div>
          </div>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="bg-white rounded-xl shadow-lg p-4 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-800 mb-3">
                  Détails du scénario
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-1">Titre</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {scenario?.title}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {scenario?.description}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-1">Informations</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-gray-600">Niveau : {scenario?.level}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        Nombre de victimes : {scenario?.victimesCount || (scenario?.victimes?.length || 0)}
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
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  {difficulty !== 'easy' && (
                    <QuizTimer
                      timeLeft={timeLeft}
                      totalTime={getTimeLimit(difficulty, timeLimit)}
                      isTimeCritical={isTimeCritical}
                    />
                  )}
                  {difficulty !== 'hard' && (
                    <div className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-gray-700">{score}/{currentVictimIndex}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h2 className="text-base font-semibold text-gray-800 mb-2">Description de la victime</h2>
                <p className="text-sm text-gray-700">{currentVictim?.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {colors.map((color, index) => {
                  const isSelected = selectedColor === index;
                  const isCorrect = index === currentVictim?.correctAnswer;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorSelect(index)}
                      disabled={gameOver || showExplanation}
                      className={`
                        ${color.bg} 
                        ${color.hover} 
                        text-white 
                        py-3 
                        px-4 
                        rounded-lg 
                        transition-colors 
                        flex 
                        items-center 
                        justify-center
                        text-sm
                        ${isSelected ? (isCorrect ? 'ring-2 ring-green-500' : 'ring-2 ring-red-500') : ''}
                        ${gameOver || showExplanation ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {color.name}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    {selectedColor === currentVictim?.correctAnswer ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        {selectedColor === currentVictim?.correctAnswer
                          ? 'Bonne réponse !'
                          : 'Mauvaise réponse'}
                      </p>
                      <p className="text-sm text-gray-600">{currentVictim?.explanation}</p>
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