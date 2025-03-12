// Interface pour l'API
export interface ApiQuestionOption {
  "@id": string;
  "@type": string;
  id: number;
  optionId: string;
  text: string;
}

export interface ApiQuestion {
  "@id": string;
  "@type": string;
  id: number;
  text: string;
  options: ApiQuestionOption[];
  correctAnswer: string;
  explanation: string;
}

export interface ApiQuiz {
  "@context": string;
  "@id": string;
  "@type": string;
  id: number;
  title: string;
  timePerQuestion: number;
  passingScore: number;
  questions: ApiQuestion[];
}

// Interfaces pour le composant
export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizComponentData {
  title: string;
  questions: QuizQuestion[];
  timePerQuestion: number;
  passingScore: number;
}

export interface Quiz {
  "@id": string;
  "@type": string;
  id: number;
  title: string;
  questions: QuizQuestion[];
  timePerQuestion: number;
  passingScore: number;
}

export interface QuizCollection {
  "@context": string;
  "@id": string;
  "@type": string;
  totalItems: number;
  member: Quiz[];
}

export interface QuizPerformance {
  stars: number;
  message: string;
} 