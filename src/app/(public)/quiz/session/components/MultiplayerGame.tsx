"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface QuestionOption {
  id: number;
  text: string;
}

interface Question {
  id: number;
  text: string;
  correctAnswer?: string;
  options: QuestionOption[];
}

interface QuizSessionState {
  timePerQuestion: number;
}

interface MultiplayerGameProps {
  session: QuizSessionState;
  currentQuestion: Question;
  isHost: boolean;
  participantId: string | null;
  timeRemaining: number;
  answeredCount: number;
  hasAnswered: boolean;
  selectedOptionId: number | null;
  answerFeedback: { isCorrect: boolean; points: number } | null;
  handleSubmitAnswer: (optId: number) => Promise<void>;
  handleNextQuestion: () => Promise<void>;
}

export function MultiplayerGame({
  session,
  currentQuestion,
  isHost,
  participantId,
  timeRemaining,
  answeredCount,
  hasAnswered,
  selectedOptionId,
  answerFeedback,
  handleSubmitAnswer,
  handleNextQuestion,
}: MultiplayerGameProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Question description */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
            Temps restant : {timeRemaining}s
          </span>
          {isHost && (
            <span className="text-xs font-semibold text-gray-600">
              Réponses reçues : {answeredCount}
            </span>
          )}
        </div>

        <h2 className="mb-6 text-xl font-bold text-gray-800 md:text-2xl">
          {currentQuestion.text}
        </h2>

        {/* Progress timer bar */}
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-purple-600 transition-all duration-1000"
            style={{
              width: `${(timeRemaining / session.timePerQuestion) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Answer Options */}
      {isHost && !participantId ? (
        // HÔTE VIEW ONLY: Question stats & Next Question controller
        <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-md">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Options proposées :</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((opt, index) => {
                const letters = ["A", "B", "C", "D"];
                const isCorrect =
                  letters[index] === currentQuestion.correctAnswer;
                return (
                  <div
                    key={opt.id}
                    className={`rounded-xl border p-4 font-medium transition-colors ${
                      isCorrect
                        ? "border-green-300 bg-green-50 text-green-900"
                        : "border-gray-200 bg-gray-50 text-gray-800"
                    }`}
                  >
                    <span className="mr-2 font-bold text-purple-600">
                      {letters[index]}.
                    </span>
                    {opt.text}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleNextQuestion}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 font-bold text-white shadow-md transition-colors hover:bg-purple-700"
          >
            Suivant <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        // PLAYING VIEW (Host playing or Participant playing)
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {currentQuestion.options.map((opt, index) => {
              const colors = [
                "border-red-200 bg-red-50 text-red-900 hover:bg-red-100 active:bg-red-200",
                "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 active:bg-blue-200",
                "border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100 active:bg-yellow-200",
                "border-green-200 bg-green-50 text-green-900 hover:bg-green-100 active:bg-green-200",
              ];
              const keyLetters = ["A", "B", "C", "D"];
              const isSelected = selectedOptionId === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSubmitAnswer(opt.id)}
                  disabled={hasAnswered || timeRemaining === 0}
                  className={`relative flex min-h-[90px] w-full items-center overflow-hidden rounded-2xl border-2 p-6 text-left text-lg font-semibold shadow-sm transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none ${
                    colors[index % colors.length]
                  } ${hasAnswered && !isSelected ? "scale-95 opacity-50" : ""} ${
                    isSelected
                      ? "scale-[1.02] border-purple-400 ring-2 ring-purple-600"
                      : ""
                  }`}
                >
                  <span className="mr-4 text-2xl font-extrabold opacity-70">
                    {keyLetters[index]}.
                  </span>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* If host is playing, show the control bar below the options */}
          {isHost && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
              <span className="text-sm font-semibold text-gray-600">
                Hôte : {answeredCount} réponses reçues
              </span>
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-purple-700"
              >
                Suivant <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Client Answer Submission feedback status */}
      {participantId && hasAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-100 bg-white p-4 text-center font-medium shadow-sm"
        >
          {!answerFeedback ? (
            <p className="animate-pulse text-gray-600">
              Réponse soumise, en attente des autres joueurs...
            </p>
          ) : answerFeedback.isCorrect ? (
            <p className="text-green-700">
              Correct ! +{answerFeedback.points} points 🎉
            </p>
          ) : (
            <p className="text-red-700">
              Incorrect. Retentez votre chance à la prochaine question !
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
