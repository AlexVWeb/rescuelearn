import { getQuestionsAction } from "@/app/actions/quiz-actions";
import QuestionsClientPage from "./client-page";

export default async function QuestionsPage(props: { searchParams?: Promise<{ page?: string; search?: string }> }) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const search = searchParams?.search || "";

    const result = await getQuestionsAction(page, 100, search);
    const questions = result.success ? result.data : [];

    return (
        <QuestionsClientPage initialQuestions={questions as any} />
    );
}
