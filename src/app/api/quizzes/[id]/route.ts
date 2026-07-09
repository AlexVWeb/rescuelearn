import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LETTER_TO_INDEX: Record<string, string> = {
  A: "0",
  B: "1",
  C: "2",
  D: "3",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        level: true,
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const formattedQuiz = {
      "@context": "/api/contexts/Quiz",
      "@id": `/api/quizzes/${quiz.id}`,
      "@type": "Quiz",
      id: quiz.id,
      title: quiz.title,
      timePerQuestion: quiz.timePerQuestion,
      passingScore: quiz.passingScore,
      modeRandom: quiz.modeRandom,
      level: {
        "@id": `/api/level_questions/${quiz.level?.id || 0}`,
        "@type": "LevelQuestion",
        id: quiz.level?.id || 0,
        name: quiz.level?.name || "Tous niveaux",
      },
      questionCount: quiz.questions.length,
      questions: quiz.questions.map((q) => {
        // Map correct answer from A/B/C/D to "0"/"1"/"2"/"3"
        const correctStr = q.correctAnswer.toUpperCase();
        const correctAnswer = LETTER_TO_INDEX[correctStr] ?? q.correctAnswer;

        return {
          "@id": `/api/questions/${q.id}`,
          "@type": "Question",
          id: q.id,
          text: q.text,
          correctAnswer,
          explanation: q.explanation || "",
          options: q.options.map((opt) => ({
            "@id": `/api/question_options/${opt.id}`,
            "@type": "QuestionOption",
            id: opt.id,
            optionId: opt.optionId || "",
            text: opt.text,
          })),
        };
      }),
    };

    return NextResponse.json(formattedQuiz);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
