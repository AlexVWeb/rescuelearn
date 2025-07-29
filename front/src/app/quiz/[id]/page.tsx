'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle, XCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { quizService } from '../services/quizService';
import { QuizTimer } from '../components/QuizTimer';
import { QuizResults } from '../components/QuizResults';
import { QuizComponentData } from '../interfaces/Quiz';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { shuffleArray } from '../utils/utils';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function QuizPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';
  const isRandomMode = searchParams.get('random') === 'true';
  const [mounted, setMounted] = useState(false);
  const [quizData, setQuizData] = useState<QuizComponentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimeCritical, setIsTimeCritical] = useState(false);
  const [performance, setPerformance] = useState({ stars: 0, message: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchQuiz = async () => {
      try {
        const data = await quizService.getQuiz(parseInt(resolvedParams.id));
        if (isRandomMode) {
          // Mélanger les questions après avoir reçu les données
          const shuffledData = {
            ...data,
            questions: shuffleArray(data.questions)
          };
          setQuizData(shuffledData);
        } else {
          setQuizData(data);
        }
        setTimeLeft(data.timePerQuestion);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement du quiz:', err);
        setError("Erreur lors du chargement du quiz. Veuillez vérifier que l'ID est correct.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [resolvedParams.id, mounted, isRandomMode]);

  const handleAnswerSubmit = useCallback((optionId: string | null) => {
    if (!quizData) return;

    setShowFeedback(true);

    if (optionId === quizData.questions[currentQuestionIndex].correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  }, [quizData, currentQuestionIndex]);

  useEffect(() => {
    if (!mounted || !quizData || quizComplete || showFeedback) return;
    if (difficulty === 'easy') return; // Désactive complètement le chronomètre en mode facile

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 10) {
          setIsTimeCritical(true);
        }

        if (prev <= 1) {
          clearInterval(timer);
          handleAnswerSubmit(null);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, quizComplete, showFeedback, quizData, mounted, handleAnswerSubmit, difficulty]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <p className="text-xl">{error || "Une erreur est survenue"}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    if (!showFeedback) {
      setSelectedOption(optionId);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex === quizData.questions.length - 1) {
      setQuizComplete(true);
      const percentage = (score / quizData.questions.length) * 100;
      let stars = 0;
      let message = '';

      if (percentage >= 90) {
        stars = 3;
        message = "Excellent ! Vous maîtrisez les gestes qui sauvent.";
      } else if (percentage >= 70) {
        stars = 2;
        message = "Bien ! Vous avez les connaissances de base en secourisme.";
      } else if (percentage >= 50) {
        stars = 1;
        message = "Pas mal, mais vous devriez réviser certains concepts.";
      } else {
        stars = 0;
        message = "Vous devez approfondir vos connaissances en secourisme.";
      }

      setPerformance({ stars, message });
    } else {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setTimeLeft(quizData.timePerQuestion);
      setIsTimeCritical(false);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setQuizComplete(false);
    setTimeLeft(quizData.timePerQuestion);
    setIsTimeCritical(false);
  };

  const handleQuit = () => {
    setDialogOpen(false);
    router.push('/quiz');
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between bg-gray-50 overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Header responsive */}
      <div className="w-full flex flex-col items-center px-2 pt-3 pb-2 bg-gray-50 z-10 sm:flex-row sm:justify-between sm:items-end sm:px-4">
        {/* Ligne du haut : retour + titre */}
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
                <DialogTitle className="text-xl font-bold text-gray-800">Quitter le quiz ?</DialogTitle>
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
                  Quitter le quiz
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <h1
            className="flex-1 text-base font-semibold text-gray-800 text-center mx-2 truncate max-w-[70vw] sm:max-w-xs overflow-hidden whitespace-nowrap"
            title={quizData.title}
          >
            {quizData.title}
          </h1>
          <div className="w-8 sm:w-12" /> {/* Espace pour équilibrer */}
        </div>
        {/* Ligne du bas : progression */}
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
            Question {currentQuestionIndex + 1}/{quizData.questions.length}
          </div>
        </div>
      </div>

      {/* Bloc central : question + options */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-2 max-w-xl mx-auto">
        {!quizComplete ? (
          <div className="w-full flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.h2
                key={currentQuestion.id}
                className="text-lg md:text-xl font-semibold text-gray-800 mb-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {currentQuestion.text}
              </motion.h2>
            </AnimatePresence>
            <div className="w-full flex flex-col gap-3 mb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col gap-3"
                >
                  {currentQuestion.options.map((option, idx) => {
                    const optionId = idx.toString();
                    return (
                      <motion.button
                        key={optionId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-600 cursor-pointer ${selectedOption === optionId
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-400'
                          } ${showFeedback && difficulty !== 'hard' && optionId === currentQuestion.correctAnswer
                            ? 'border-green-600 bg-green-50'
                            : showFeedback && selectedOption === optionId && optionId !== currentQuestion.correctAnswer
                              ? 'border-red-600 bg-red-50'
                              : ''
                          }`}
                        onClick={() => handleOptionSelect(optionId)}
                        aria-pressed={selectedOption === optionId}
                        tabIndex={0}
                        disabled={showFeedback}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${selectedOption === optionId
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                            } ${showFeedback && difficulty !== 'hard' && optionId === currentQuestion.correctAnswer
                              ? 'bg-green-600 text-white'
                              : showFeedback && selectedOption === optionId && optionId !== currentQuestion.correctAnswer
                                ? 'bg-red-600 text-white'
                                : ''
                            }`}>
                            {showFeedback && difficulty !== 'hard' && optionId === currentQuestion.correctAnswer ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : showFeedback && selectedOption === optionId && optionId !== currentQuestion.correctAnswer ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <span className="text-sm font-medium">{idx + 1}</span>
                            )}
                          </div>
                          <span className="text-gray-800">{option.text}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Feedback en overlay centré, sans décaler le bouton */}
            <AnimatePresence>
              {showFeedback && difficulty !== 'hard' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[90vw] max-w-md p-6 rounded-xl shadow-lg border text-center ${selectedOption === currentQuestion.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="flex flex-col items-center">
                    {selectedOption === currentQuestion.correctAnswer ? (
                      <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600 mb-2" />
                    )}
                    <p className={`font-medium ${selectedOption === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'} mb-1`}>
                      {selectedOption === currentQuestion.correctAnswer ? 'Bonne réponse !' : 'Réponse incorrecte'}
                    </p>
                    <p className="text-gray-700 text-sm">{currentQuestion.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center h-full">
            <QuizResults
              score={score}
              totalQuestions={quizData.questions.length}
              passingScore={quizData.passingScore}
              performance={performance}
              onRestart={restartQuiz}
              difficulty={difficulty}
            />
          </div>
        )}
      </div>

      {/* Footer : bouton de validation toujours visible */}
      {!quizComplete && (
        <div className="w-full px-4 pb-4 pt-2 flex flex-col items-center z-10 bg-gray-50">
          <div className="flex items-center space-x-4 mb-2">
            {difficulty !== 'hard' && (
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-700 font-medium">{score}/{currentQuestionIndex}</span>
              </div>
            )}
            {difficulty !== 'easy' && (
              <div className="flex items-center space-x-2">
                <QuizTimer
                  timeLeft={timeLeft}
                  totalTime={quizData.timePerQuestion}
                  isTimeCritical={isTimeCritical}
                />
              </div>
            )}
          </div>
          <div className="w-full max-w-xl">
            {!showFeedback ? (
              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                whileHover={{ scale: selectedOption ? 1.05 : 1 }}
                whileTap={{ scale: selectedOption ? 0.95 : 1 }}
                onClick={() => selectedOption && handleAnswerSubmit(selectedOption)}
                disabled={!selectedOption}
              >
                Valider ma réponse
              </motion.button>
            ) : (
              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-md flex items-center justify-center text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNextQuestion}
              >
                {currentQuestionIndex === quizData.questions.length - 1 ? (
                  'Voir mes résultats'
                ) : (
                  <>
                    Question suivante
                    <ChevronRight className="ml-1 w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      )}
      <Analytics />
      <SpeedInsights />
    </div>
  );
} 