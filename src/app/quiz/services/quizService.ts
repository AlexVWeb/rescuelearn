import axios from 'axios';
import { ApiQuiz, QuizComponentData } from '../interfaces/Quiz';


const transformApiQuizToComponentData = (apiQuiz: ApiQuiz): QuizComponentData => {
  return {
    title: apiQuiz.title,
    questions: apiQuiz.questions.map(question => ({
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
      const response = await axios.get<ApiQuiz>(`${process.env.API_BASE_URL}/quizzes/${id}`);
      return transformApiQuizToComponentData(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération du quiz:', error);
      throw error;
    }
  }
}; 