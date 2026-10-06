import { getAdminLearningCardsAction } from "@/app/actions/learning-card-actions";
import { getAllReferencielsSimpleAction } from "@/app/actions/quiz-actions";
import CardsClientPage, { LearningCardAdmin } from "./client-page";
import { requireSuperAdmin } from "@/lib/context";
import { parseArchiveFilter } from "@/lib/content-archive";

export default async function CardsAdminPage(props: {
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

  const [cardsResult, referenciels] = await Promise.all([
    getAdminLearningCardsAction(page, 10, search, { archived, referencielId }),
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
      archived={archived}
      referencielId={referencielId}
    />
  );
}
