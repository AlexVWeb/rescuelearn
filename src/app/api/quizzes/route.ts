import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where: {
          status: "PUBLISHED",
        },
        skip,
        take: limit,
        orderBy: { id: "desc" },
        include: {
          level: true,
          questions: true,
        },
      }),
      prisma.quiz.count({
        where: { status: "PUBLISHED" },
      }),
    ]);

    const formattedQuizzes = quizzes.map((q) => ({
      "@id": `/api/quizzes/${q.id}`,
      "@type": "Quiz",
      id: q.id,
      title: q.title,
      questions: [],
      timePerQuestion: q.timePerQuestion,
      passingScore: q.passingScore,
      modeRandom: q.modeRandom,
      level: q.level?.name || "Tous niveaux",
      questionCount: q.questions.length,
    }));

    return NextResponse.json({
      "@context": "/api/contexts/Quiz",
      "@id": "/api/quizzes",
      "@type": "hydra:Collection",
      totalItems: total,
      member: formattedQuizzes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
