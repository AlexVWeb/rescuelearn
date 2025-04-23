import { motion } from 'framer-motion';
import { Award, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  passingScore: number;
  performance: {
    stars: number;
    message: string;
  };
  onRestart: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const QuizResults = ({ score, totalQuestions, passingScore, performance, onRestart, difficulty }: QuizResultsProps) => {
  const router = useRouter();

  const getDifficultyBadge = () => {
    switch (difficulty) {
      case 'easy':
        return <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Mode Facile</span>;
      case 'medium':
        return <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">Mode Intermédiaire</span>;
      case 'hard':
        return <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Mode Difficile</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">

        <div className="flex justify-center items-center mb-4 gap-2">
          {getDifficultyBadge()}
          
          <motion.div 
            className="inline-block"
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {score >= (passingScore * totalQuestions) / 100 ? (
              <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
            ) : (
              <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
            )}
          </motion.div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Terminé !</h2>
        <div className="h-1 w-20 bg-red-600 mx-auto mb-4"></div>
        
        <div className="flex justify-center items-center space-x-1 mb-4">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{ 
                opacity: i < performance.stars ? 1 : 0.3,
                scale: i < performance.stars ? 1 : 0.8
              }}
              transition={{ delay: 0.3 + (i * 0.2) }}
            >
              <Award className={`w-8 h-8 ${i < performance.stars ? 'text-yellow-500' : 'text-gray-300'}`} />
            </motion.div>
          ))}
        </div>
        
        <div className="text-lg text-gray-700 mb-6">
          <p>Votre score: <span className="font-bold">{score}/{totalQuestions}</span></p>
          <p className="text-sm mt-1">
            ({Math.round((score / totalQuestions) * 100)}%)
          </p>
        </div>
        
        <p className="text-gray-700 mb-4">{performance.message}</p>
        
        <motion.button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full shadow-md flex items-center justify-center mx-auto cursor-pointer mb-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
        >
          Recommencer le Quiz
        </motion.button>
  
        <motion.button
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-full shadow-md flex items-center justify-center mx-auto cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/quiz')}
        >
          Retour à la liste des quiz
        </motion.button>
      </div>
    </motion.div>
  ); 
}