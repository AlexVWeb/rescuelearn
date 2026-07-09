import { getAdminLearningCardsAction } from "@/app/actions/learning-card-actions";
import { getAllReferencielsSimpleAction } from "@/app/actions/quiz-actions";
import CardsClientPage, { LearningCardAdmin } from "./client-page";
import { requireSuperAdmin } from "@/lib/context";

export default async function CardsAdminPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const [cardsResult, referenciels] = await Promise.all([
    getAdminLearningCardsAction(page, 10, search),
    getAllReferencielsSimpleAction(),
  ]);

  const cards = cardsResult.success && cardsResult.data ? cardsResult.data : [];
  const meta =
    cardsResult.success && cardsResult.meta
      ? cardsResult.meta
      : { total: 0, page: 1, limit: 10, totalPages: 1 };

  return (
    <CardsClientPage
      initialCards={cards as LearningCardAdmin[]}
      referenciels={referenciels}
      meta={meta}
    />
  );
}
