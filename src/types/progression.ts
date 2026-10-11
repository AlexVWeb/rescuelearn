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
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME" | "VIDEO";
  questionId?: number | null;
  learningCardId?: number | null;
  courseTitle?: string | null;
  courseContent?: string | null;
  // URL ou identifiant YouTube saisi par l'admin, revalidé côté serveur
  videoUrl?: string | null;
  videoTitle?: string | null;
  videoDurationSec?: number | null;
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
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "VIDEO";
  questionId?: number | null;
  learningCardId?: number | null;
  courseTitle?: string | null;
  courseContent?: string | null;
  videoUrl?: string | null;
  videoTitle?: string | null;
  videoDurationSec?: number | null;
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

export interface PlaySessionVideo {
  youtubeId: string;
  title: string | null;
  durationSec: number;
  // Position validée par le serveur (reprise) ; lecture libre une fois validée
  watchedSec: number;
  completed: boolean;
}

export interface PlaySessionExercise {
  id: string;
  type: "MICRO_COURSE" | "QUIZ_QUESTION" | "FLASHCARD" | "MINI_GAME" | "VIDEO";
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
  video?: PlaySessionVideo | null;
}
