import {
  getAllReferencielsSimpleAction,
  getQuizzesAction,
  Quiz,
} from "@/app/actions/quiz-actions";
import QuizClientPage from "./client-page";
import { requireSuperAdmin } from "@/lib/context";
import { parseArchiveFilter } from "@/lib/content-archive";

export default async function QuizPage(props: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    archived?: string;
    referencielId?: string;
  }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";
  const archived = parseArchiveFilter(searchParams?.archived);
  const referencielId = Number(searchParams?.referencielId) || undefined;

  const [result, referenciels] = await Promise.all([
    getQuizzesAction(page, 100, search, { archived, referencielId }),
    getAllReferencielsSimpleAction(),
  ]);
  const quizzes = result.success ? result.data : [];

  return (
    <QuizClientPage
      initialQuizzes={quizzes as Quiz[]}
      referenciels={referenciels}
      archived={archived}
      referencielId={referencielId}
    />
  );
}
