import { motion } from "framer-motion";
import { Clock } from "lucide-react";

interface QuizTimerProps {
  timeLeft: number;
  totalTime: number;
  isTimeCritical: boolean;
}

export const QuizTimer = ({
  timeLeft,
  totalTime,
  isTimeCritical,
}: QuizTimerProps) => {
  const getTimerColor = () => {
    if (isTimeCritical) {
      return "#DC2626"; // Rouge pour temps critique
    } else if (timeLeft < totalTime / 2) {
      return "#F59E0B"; // Orange pour temps intermédiaire
    } else {
      return "#3B82F6"; // Bleu pour temps suffisant
    }
  };

  return (
    <div className="relative h-12 w-12 md:h-16 md:w-16">
      <svg className="h-full w-full" viewBox="0 0 100 100">
        {/* Cercle de fond */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="8"
        />

        {/* Cercle de progression */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getTimerColor()}
          strokeWidth="8"
          strokeDasharray="283"
          strokeDashoffset={283 * (1 - timeLeft / totalTime)}
          transform="rotate(-90 50 50)"
          animate={{
            strokeDashoffset: 283 * (1 - timeLeft / totalTime),
            stroke: getTimerColor(),
          }}
          transition={{ duration: 0.5 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: isTimeCritical ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isTimeCritical ? Infinity : 0, duration: 0.5 }}
        >
          <Clock
            className={`h-6 w-6 md:h-8 md:w-8 ${isTimeCritical ? "text-red-600" : "text-gray-700"}`}
          />
        </motion.div>
      </div>
      <div className="absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-white">
        {timeLeft}
      </div>
    </div>
  );
};
