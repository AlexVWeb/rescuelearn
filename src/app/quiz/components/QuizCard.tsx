import { motion, Variants } from 'framer-motion';
import { Activity, BookOpen, Clock, Users, Star, ChevronRight, CheckCircle } from 'lucide-react';
import { Quiz } from '../interfaces/Quiz';

interface QuizCardProps {
  quiz: Quiz;
  isHovered: boolean;
  onHover: (id: number | null) => void;
  itemVariants: Variants;
}

const getDifficultyColor = (difficulty: string): string => {
  switch(difficulty) {
    case "Débutant":
      return "bg-green-500";
    case "Intermédiaire":
      return "bg-yellow-500";
    case "Avancé":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getCompletionWidth = (percentage: number): string => {
  return `${percentage}%`;
};

export const QuizCard = ({ quiz, isHovered, onHover, itemVariants }: QuizCardProps) => (
  <motion.div 
    key={quiz.id}
    className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 relative ${
      isHovered ? 'ring-2 ring-blue-500' : ''
    }`}
    variants={itemVariants}
    onMouseEnter={() => onHover(quiz.id)}
    onMouseLeave={() => onHover(null)}
    whileHover={{ y: -5 }}
  >
    {/* Badges pour Populaire ou Nouveau */}
    {quiz.popular && (
      <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
        <Activity className="w-3 h-3 mr-1" />
        Populaire
      </div>
    )}
    {quiz.new && (
      <div className="absolute top-3 left-3 z-10 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
        <BookOpen className="w-3 h-3 mr-1" />
        Nouveau
      </div>
    )}
    
    {/* Image du quiz */}
    <div className="relative h-48 bg-blue-50">
      <img 
        src={quiz.imageUrl} 
        alt={quiz.title}
        className="w-full h-full object-cover"
      />
      {/* Indicateur de difficulté */}
      <div className="absolute bottom-3 right-3 flex items-center bg-white bg-opacity-90 px-2 py-1 rounded-full shadow-sm">
        <div className={`w-2 h-2 rounded-full ${getDifficultyColor(quiz.difficulty)} mr-1`}></div>
        <span className="text-xs font-medium">{quiz.difficulty}</span>
      </div>
    </div>
    
    {/* Contenu du quiz */}
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {quiz.category}
        </span>
        <div className="flex items-center">
          <Star className="w-4 h-4 text-yellow-500 mr-1" />
          <span className="text-sm font-medium">{quiz.rating}</span>
          <span className="text-xs text-gray-500 ml-1">({quiz.reviews})</span>
        </div>
      </div>
      
      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">{quiz.title}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          <span>{quiz.duration} min</span>
        </div>
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{quiz.questions} questions</span>
        </div>
      </div>
      
      {/* Barre de progression si le quiz a été commencé */}
      {quiz.completion > 0 && (
        <div className="mb-3">
          <div className="relative pt-1">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  Progression
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {quiz.completion}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
              <div 
                style={{ width: getCompletionWidth(quiz.completion) }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bouton d'action */}
      {quiz.completion === 100 ? (
        // Quiz complété
        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center transition-colors">
          <CheckCircle className="w-4 h-4 mr-2" />
          Complété - Revoir
        </button>
      ) : quiz.completion > 0 ? (
        // Quiz commencé
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center transition-colors">
          <Activity className="w-4 h-4 mr-2" />
          Continuer
        </button>
      ) : (
        // Quiz pas encore commencé
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center transition-colors group">
          <span>Commencer</span>
          <ChevronRight className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </div>
    
    {/* Tags du quiz */}
    <div className="px-4 pb-4 flex flex-wrap gap-2">
      {quiz.tags.map((tag, index) => (
        <span 
          key={`${quiz.id}-${index}`} 
          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
        >
          #{tag}
        </span>
      ))}
    </div>
  </motion.div>
); 