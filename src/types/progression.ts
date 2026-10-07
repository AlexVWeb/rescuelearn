export interface NewQuestion {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topicId?: string;
}

export interface NewFlashcard {
  theme: string;
  info: string;
  reference: string;
  niveau: string;
}

export interface Exercise {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME";
  questionId?: number | null;
  learningCardId?: number | null;
  courseTitle?: string | null;
  courseContent?: string | null;
  _newQuestion?: NewQuestion;
  _newFlashcard?: NewFlashcard;
}

export interface AiGeneratedExercise {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD";
  courseTitle?: string;
  courseContent?: string;
  questionText?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  flashcardTheme?: string;
  flashcardInfo?: string;
  flashcardReference?: string;
  description?: string;
  content?: string;
}

export interface AiGeneratedNode {
  title: string;
  description: string;
  exercises: AiGeneratedExercise[];
}

export interface AiGeneratedExerciseForBuilder {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME";
  courseTitle?: string | null;
  courseContent?: string | null;
  questionId?: number | null;
  learningCardId?: number | null;
  _newQuestion?: {
    text: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    topicId?: string;
  };
  _newFlashcard?: {
    theme: string;
    info: string;
    reference: string;
    niveau: string;
  };
}

export interface ProgressionExerciseInput {
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD";
  questionId?: number | null;
  learningCardId?: number | null;
  courseTitle?: string | null;
  courseContent?: string | null;
  _newQuestion?: {
    text: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    topicId?: string;
  };
  _newFlashcard?: {
    theme: string;
    info: string;
    reference: string;
    niveau: string;
  };
}

export interface PlaySessionExercise {
  id: string;
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME";
  courseTitle?: string | null;
  courseContent?: string | null;
  // La bonne réponse n'est révélée qu'après validation côté serveur
  question?: {
    text: string;
    options: { id?: string | number; text: string }[];
  } | null;
  flashcard?: {
    theme: string;
    info: string;
    reference: string | null;
  } | null;
}
