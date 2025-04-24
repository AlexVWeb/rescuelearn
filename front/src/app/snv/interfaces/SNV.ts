export interface Victim {
  '@context': string;
  '@id': string;
  '@type': string;
  id: number;
  description: string;
  correctAnswer: number; // 0: Vert, 1: Jaune, 2: Rouge, 3: Noir
  explanation: string;
  scenario: string;
}

export interface SNVScenario {
  '@context': string;
  '@id': string;
  '@type': string;
  id: number;
  title: string;
  level: string;
  description: string;
  victimes?: Victim[];
  victimesCount?: number;
}

export interface SNVCollection {
  '@context': string;
  '@id': string;
  '@type': string;
  totalItems: number;
  member: SNVScenario[];
  view: {
    '@id': string;
    '@type': string;
  };
} 