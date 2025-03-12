'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Award, CheckCircle, XCircle, AlertTriangle, Activity, ChevronRight } from 'lucide-react';
import { quizService } from '../services/quizService';
import { EcgLine } from '../components/EcgLine';
import { QuizTimer } from '../components/QuizTimer';
import { QuizResults } from '../components/QuizResults';
import { QuizComponentData } from '../interfaces/Quiz';

interface PageProps {
  params: {
    id: string;
  };
}

export default function QuizPage({ params }: PageProps) {
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
  const [timerActive, setTimerActive] = useState(true);
  const [performance, setPerformance] = useState({ stars: 0, message: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchQuiz = async () => {
      try {
        const data = await quizService.getQuiz(parseInt(params.id));
        setQuizData(data);
        setTimeLeft(data.timePerQuestion);
      } catch {
        setError("Erreur lors du chargement du quiz");
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [params.id, mounted]);

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
    setTimerActive(true);
    setPerformance({ stars: 0, message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4 sm:px-6">
      <div className="relative max-w-4xl mx-auto">
        <EcgLine />
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-2">
            <Heart className="w-6 h-6 text-red-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{quizData.title}</h1>
          </div>
          
          {!quizComplete && (
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
              <div className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full text-sm">
                Question {currentQuestionIndex + 1}/{quizData.questions.length}
              </div>
              
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-700 font-medium">{score}/{currentQuestionIndex}</span>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
              <QuizTimer 
                timeLeft={timeLeft}
                totalTime={quizData.timePerQuestion}
                isTimeCritical={isTimeCritical}
              />
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
                  {currentQuestion.options.map((option, idx) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.1 }}
                    >
                      <div
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedOption === option.id 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-400'
                        } ${
                          showFeedback && option.id === currentQuestion.correctAnswer
                            ? 'border-green-600 bg-green-50'
                            : showFeedback && selectedOption === option.id && option.id !== currentQuestion.correctAnswer
                            ? 'border-red-600 bg-red-50'
                            : ''
                        }`}
                        onClick={() => handleOptionSelect(option.id)}
                      >
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              selectedOption === option.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            } ${
                              showFeedback && option.id === currentQuestion.correctAnswer
                                ? 'bg-green-600 text-white'
                                : showFeedback && selectedOption === option.id && option.id !== currentQuestion.correctAnswer
                                ? 'bg-red-600 text-white'
                                : ''
                            }`}>
                              {showFeedback && option.id === currentQuestion.correctAnswer ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : showFeedback && selectedOption === option.id && option.id !== currentQuestion.correctAnswer ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <span className="text-sm font-medium">{option.id.toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-gray-800">{option.text}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <AnimatePresence>
              {showFeedback && (
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