// La banque de questions stocke la bonne réponse sous forme de lettre ("A"-"D").
// Les premiers parcours générés stockaient un index ("0"-"3") : on lit les deux.
const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

export function answerIndex(correctAnswer: string): number {
  const value = correctAnswer.trim().toUpperCase();
  const letterIndex = ANSWER_LETTERS.indexOf(
    value as (typeof ANSWER_LETTERS)[number]
  );
  if (letterIndex !== -1) return letterIndex;
  return /^\d+$/.test(value) ? parseInt(value, 10) : -1;
}

export function answerLetter(index: number): string {
  return ANSWER_LETTERS[index] ?? "A";
}

// Mélange de Fisher-Yates : supprime le biais de position des réponses de l'IA
export function shuffleOptions(
  options: string[],
  correctIndex: number,
  random: () => number = Math.random
): { options: string[]; correctIndex: number } {
  const mapped = options.map((text, idx) => ({
    text,
    isCorrect: idx === correctIndex,
  }));
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }
  return {
    options: mapped.map((item) => item.text),
    correctIndex: mapped.findIndex((item) => item.isCorrect),
  };
}
