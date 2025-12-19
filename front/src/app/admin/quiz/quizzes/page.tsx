import { getQuizzesAction } from "@/app/actions/quiz-actions";
import QuizClientPage from "./client-page";

export default async function QuizPage(props: { searchParams?: Promise<{ page?: string; search?: string }> }) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const search = searchParams?.search || "";

    const result = await getQuizzesAction(page, 100, search);
    const quizzes = result.success ? result.data : [];

    return (
        <QuizClientPage initialQuizzes={quizzes as any} />
    );
}
