import axios from 'axios';
import { ApiQuiz, QuizComponentData } from '../interfaces/Quiz';

// Utilisation de la variable d'environnement avec le préfixe NEXT_PUBLIC_
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

// Fonction pour mélanger un tableau de manière aléatoire (algorithme Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const transformApiQuizToComponentData = (apiQuiz: ApiQuiz): QuizComponentData => {
  return {
    title: apiQuiz.title,
    questions: shuffleArray(apiQuiz.questions).map(question => ({
      id: question.id,
      text: question.text,
      options: question.options.map(option => ({
        id: option.optionId.toLowerCase(),
        text: option.text
      })),
      correctAnswer: question.correctAnswer.toLowerCase(),
      explanation: question.explanation
    })),
    timePerQuestion: apiQuiz.timePerQuestion,
    passingScore: apiQuiz.passingScore
  };
};

export const quizService = {
  async getQuiz(id: number): Promise<QuizComponentData> {
    try {
      const response = await axios.get<ApiQuiz>(`${API_BASE_URL}/quizzes/${id}`);
      return transformApiQuizToComponentData(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération du quiz:', error);
      throw error;
    }
  }
}; 