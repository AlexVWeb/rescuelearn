import { getQuestionsAction, Question } from "@/app/actions/quiz-actions";
import QuestionsClientPage from "./client-page";
import { requireSuperAdmin } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { parseArchiveFilter } from "@/lib/content-archive";
import {
  parseQuestionSource,
  type QuestionFilters,
} from "@/lib/question-filters";

// Assez pour sélectionner une banque entière d'un coup
const QUESTIONS_LIMIT = 1000;

export default async function QuestionsPage(props: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    source?: string;
    quizId?: string;
    archived?: string;
    incomplete?: string;
  }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";
  const filters: QuestionFilters = {
    source: parseQuestionSource(searchParams?.source),
    quizId: Number(searchParams?.quizId) || undefined,
    // Par défaut tout est visible : les banques de progression sont souvent archivées
    archived: searchParams?.archived
      ? parseArchiveFilter(searchParams.archived)
      : "all",
    incomplete: searchParams?.incomplete === "1",
  };

  const [result, quizzes] = await Promise.all([
    getQuestionsAction(page, QUESTIONS_LIMIT, search, filters),
    prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        archivedAt: true,
        _count: { select: { questions: true } },
      },
      orderBy: { title: "asc" },
    }),
  ]);
  const questions = result.success ? result.data : [];
  const total = result.success ? (result.meta?.total ?? 0) : 0;

  return (
    <QuestionsClientPage
      initialQuestions={questions as Question[]}
      total={total}
      filters={filters}
      quizzes={quizzes}
    />
  );
}
