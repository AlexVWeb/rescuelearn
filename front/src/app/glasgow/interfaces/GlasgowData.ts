/**
 * Interfaces pour le système d'entraînement au Score de Glasgow
 */

export interface GlasgowItem {
    score: number;
    description: string;
}

export interface GlasgowData {
    oculaire: GlasgowItem[];
    verbale: GlasgowItem[];
    motrice: GlasgowItem[];
}

export type GameMode = 'mixed' | 'scores' | 'descriptions';

export interface UserAnswers {
    [cellId: string]: string;
}

export interface ScoreResult {
    correct: number;
    total: number;
}

export interface GlasgowTrainingProps {
    className?: string;
}
