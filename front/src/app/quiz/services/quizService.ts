import axios from 'axios';
import { ApiQuiz, QuizComponentData } from '../interfaces/Quiz';

// Utilisation de la variable d'environnement avec le préfixe NEXT_PUBLIC_
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const transformApiQuizToComponentData = (apiQuiz: ApiQuiz): QuizComponentData => {
  return {
    title: apiQuiz.title,
    questions: apiQuiz.questions.map(question => ({
      id: question.id,
      text: question.text,
      options: question.options.map(option => ({
        id: option.id,
        text: option.text
      })),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    })),
    timePerQuestion: apiQuiz.timePerQuestion,
    passingScore: apiQuiz.passingScore,
    modeRandom: apiQuiz.modeRandom,
    level: apiQuiz.level.name,
    questionCount: apiQuiz.questionCount
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