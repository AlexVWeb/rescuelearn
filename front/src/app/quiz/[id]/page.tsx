'use client';

import React, { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Award, CheckCircle, XCircle, AlertTriangle, Activity, ChevronRight } from 'lucide-react';
import { quizService } from '../services/quizService';
import { EcgLine } from '../components/EcgLine';
import { QuizTimer } from '../components/QuizTimer';
import { QuizResults } from '../components/QuizResults';
import { QuizComponentData } from '../interfaces/Quiz';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
  const [timerActive, setTimerActive] = useState(difficulty !== 'easy');
  const [performance, setPerformance] = useState({ stars: 0, message: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchQuiz = async () => {
      try {
        const data = await quizService.getQuiz(parseInt(resolvedParams.id));
        // Mélanger les questions après avoir reçu les données
        const shuffledData = {
          ...data,
          //questions: shuffleArray(data.questions)
          questions: data.questions
        };
        setQuizData(shuffledData);
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
  }, [resolvedParams.id, mounted]);

  useEffect(() => {
    if (!mounted || !quizData || !timerActive || quizComplete || showFeedback) return;

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
  }, [currentQuestionIndex, timerActive, quizComplete, showFeedback, quizData, mounted]);

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

  const handleAnswerSubmit = (optionId: string | null) => {
    setTimerActive(false);
    setShowFeedback(true);
    
    if (optionId === currentQuestion.correctAnswer) {
      setScore(prevScore => prevScore + 1);
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
      setTimerActive(true);
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
    setTimerActive(difficulty !== 'easy');
    setPerformance({ stars: 0, message: '' });
  };

  const handleQuit = () => {
    setDialogOpen(false);
    router.push('/quiz');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4 sm:px-6">
      <EcgLine />
      <div className="relative max-w-4xl mx-auto">        
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-2">
            <Heart className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{quizData.title}</h1>
          </div>
          
          {!quizComplete && difficulty !== 'hard' && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-4">
              <motion.div 
                className="h-full bg-blue-600"
                initial={{ width: `${progress}%`, backgroundColor: '#3B82F6' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
        
        {!quizComplete ? (
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6 relative">
            <div className="flex justify-between items-center mb-6">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button 
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-full transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Retour aux quiz</span>
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
              <div className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full text-sm">
                Question {currentQuestionIndex + 1}/{quizData.questions.length}
              </div>

              <div className="flex items-center space-x-4">
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
            </div>
            
            <div className="mb-8">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={currentQuestion.id}
                  className="text-xl md:text-2xl font-semibold text-gray-800 mb-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {currentQuestion.text}
                </motion.h2>
              </AnimatePresence>
            </div>
            
            <div className="space-y-3 mb-8">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentQuestion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, idx) => {
                    const optionId = option.id.toString();
                    return (
                    <motion.div
                      key={optionId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                    >
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedOption === optionId 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-400'
                        } ${
                          showFeedback && difficulty !== 'hard' && optionId === currentQuestion.correctAnswer
                            ? 'border-green-600 bg-green-50'
                            : showFeedback && selectedOption === optionId && optionId !== currentQuestion.correctAnswer
                            ? 'border-red-600 bg-red-50'
                            : ''
                        }`}
                        onClick={() => handleOptionSelect(optionId)}
                      >
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              selectedOption === optionId
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            } ${
                              showFeedback && difficulty !== 'hard' && optionId === currentQuestion.correctAnswer
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
                          </div>
                          <span className="text-gray-800">{option.text}</span>
                        </div>
                      </div>
                    </motion.div>
                  )})}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <AnimatePresence>
              {showFeedback && difficulty !== 'hard' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-lg ${selectedOption === currentQuestion.correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'} mb-6`}
                >
                  <div className="flex items-start">
                    {selectedOption === currentQuestion.correctAnswer ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${selectedOption === currentQuestion.correctAnswer ? 'text-green-800' : 'text-red-800'} mb-1`}>
                        {selectedOption === currentQuestion.correctAnswer ? 'Bonne réponse !' : 'Réponse incorrecte'}
                      </p>
                      <p className="text-gray-700">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex justify-end">
              {!showFeedback ? (
                <motion.button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: selectedOption ? 1.05 : 1 }}
                  whileTap={{ scale: selectedOption ? 0.95 : 1 }}
                  onClick={() => selectedOption && handleAnswerSubmit(selectedOption)}
                  disabled={!selectedOption}
                >
                  Valider ma réponse
                </motion.button>
              ) : (
                <motion.button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full shadow-md flex items-center"
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
        ) : (
          <QuizResults
            score={score}
            totalQuestions={quizData.questions.length}
            passingScore={quizData.passingScore}
            performance={performance}
            onRestart={restartQuiz}
            difficulty={difficulty}
          />
        )}
        
        <div className="text-center text-sm text-gray-600 mt-6 flex items-center justify-center">
          <Activity className="w-4 h-4 text-red-500 mr-2" />
          <span>Quiz développé pour la formation en secourisme</span>
        </div>
      </div>
    </div>
  );
} 