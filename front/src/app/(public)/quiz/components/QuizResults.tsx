import { motion } from "framer-motion";
import { Award, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  passingScore: number;
  performance: {
    stars: number;
    message: string;
  };
  onRestart: () => void;
  difficulty: "easy" | "medium" | "hard";
}

export const QuizResults = ({
  score,
  totalQuestions,
  passingScore,
  performance,
  onRestart,
  difficulty,
}: QuizResultsProps) => {
  const router = useRouter();

  const getDifficultyBadge = () => {
    switch (difficulty) {
      case "easy":
        return (
          <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            Mode Facile
          </span>
        );
      case "medium":
        return (
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            Mode Intermédiaire
          </span>
        );
      case "hard":
        return (
          <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            Mode Difficile
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-lg md:p-8"
    >
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          {getDifficultyBadge()}

          <motion.div
            className="inline-block"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {score >= (passingScore * totalQuestions) / 100 ? (
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-500" />
            ) : (
              <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-yellow-500" />
            )}
          </motion.div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800">
          Quiz Terminé !
        </h2>
        <div className="mx-auto mb-4 h-1 w-20 bg-red-600"></div>

        <div className="mb-4 flex items-center justify-center space-x-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{
                opacity: i < performance.stars ? 1 : 0.3,
                scale: i < performance.stars ? 1 : 0.8,
              }}
              transition={{ delay: 0.3 + i * 0.2 }}
            >
              <Award
                className={`h-8 w-8 ${i < performance.stars ? "text-yellow-500" : "text-gray-300"}`}
              />
            </motion.div>
          ))}
        </div>

        <div className="mb-6 text-lg text-gray-700">
          <p>
            Votre score:{" "}
            <span className="font-bold">
              {score}/{totalQuestions}
            </span>
          </p>
          <p className="mt-1 text-sm">
            ({Math.round((score / totalQuestions) * 100)}%)
          </p>
        </div>

        <p className="mb-4 text-gray-700">{performance.message}</p>

        <motion.button
          className="mx-auto mb-4 flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-6 py-2 font-medium text-white shadow-md hover:bg-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
        >
          Recommencer le Quiz
        </motion.button>

        <motion.button
          className="mx-auto flex cursor-pointer items-center justify-center rounded-full bg-blue-600 px-6 py-2 font-medium text-white shadow-md hover:bg-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/quiz")}
        >
          Retour à la liste des quiz
        </motion.button>
      </div>
    </motion.div>
  );
};
