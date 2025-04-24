'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { SNVScenario } from '../interfaces/SNV';
import { snvService } from '../services/snvService';
import { motion } from 'framer-motion';
import { QuizTimer } from '../../quiz/components/QuizTimer';
import { SnvResults } from '../components/SnvResults';

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
  
  const searchParams = useSearchParams();
  const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard';
  const isRandomMode = searchParams.get('random') === 'true';
  const timeLimit = searchParams.get('time') ? parseInt(searchParams.get('time')!) : 60;
  const { id: scenarioId } = React.use(params);

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
    if (timeLeft > 0 && !gameOver && difficulty !== 'easy') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 10) {
            setIsTimeCritical(true);
          }
          
          if (prev <= 1) {
            clearInterval(timer);
            handleColorSelect(-1); // Sélection automatique si le temps est écoulé
            return 0;
          }
          
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, gameOver, difficulty]);

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

  const handleColorSelect = (colorIndex: number) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{scenario.title}</h1>
          <p className="text-gray-600 mb-4">{scenario.description}</p>
          
          {gameOver ? (
            <SnvResults
              score={score}
              totalVictims={scenario.victimes.length}
              performance={performance}
              onRestart={restartScenario}
              difficulty={difficulty}
            />
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  {difficulty !== 'easy' && (
                    <QuizTimer 
                      timeLeft={timeLeft}
                      totalTime={getTimeLimit(difficulty, timeLimit)}
                      isTimeCritical={isTimeCritical}
                    />
                  )}
                  <div className="text-gray-700">
                    Victime {currentVictimIndex + 1} sur {scenario.victimes.length}
                  </div>
                </div>
              </div>

              {difficulty !== 'hard' && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
                  <motion.div 
                    className="h-full bg-blue-600"
                    initial={{ width: `${progress}%`, backgroundColor: '#3B82F6' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Description de la victime</h2>
                <p className="text-gray-700">{currentVictim.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {colors.map((color, index) => {
                  const isSelected = selectedColor === index;
                  const isCorrect = index === currentVictim.correctAnswer;
                  
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
                        py-4 
                        px-6 
                        rounded-lg 
                        transition-colors 
                        flex 
                        items-center 
                        justify-center
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
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    {selectedColor === currentVictim.correctAnswer ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 mt-1" />
                    )}
                    <div>
                      <p className="text-gray-700 font-medium mb-2">
                        {selectedColor === currentVictim.correctAnswer
                          ? 'Bonne réponse !'
                          : 'Mauvaise réponse'}
                      </p>
                      <p className="text-gray-600">{currentVictim.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SNVGame; 