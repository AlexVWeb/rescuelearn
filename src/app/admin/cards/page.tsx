import { getAdminLearningCardsAction } from "@/app/actions/learning-card-actions";
import { getAllReferencielsSimpleAction } from "@/app/actions/quiz-actions";
import CardsClientPage, { LearningCardAdmin } from "./client-page";
import { requireSuperAdmin } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { parseArchiveFilter } from "@/lib/content-archive";
import { parseCardUsage, type CardFilters } from "@/lib/card-filters";

const PAGE_SIZE = 20;

export default async function CardsAdminPage(props: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    archived?: string;
    referencielId?: string;
    niveau?: string;
    usage?: string;
    incomplete?: string;
  }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";
  const filters: CardFilters = {
    archived: parseArchiveFilter(searchParams?.archived),
    referencielId: Number(searchParams?.referencielId) || undefined,
    niveau: searchParams?.niveau || undefined,
    usage: parseCardUsage(searchParams?.usage),
    incomplete: searchParams?.incomplete === "1",
  };

  const [cardsResult, referenciels, niveaux] = await Promise.all([
    getAdminLearningCardsAction(page, PAGE_SIZE, search, filters),
    getAllReferencielsSimpleAction(),
    prisma.learningCard.findMany({
      distinct: ["niveau"],
      select: { niveau: true },
      orderBy: { niveau: "asc" },
    }),
  ]);

  const cards = cardsResult.success && cardsResult.data ? cardsResult.data : [];
  const meta =
    cardsResult.success && cardsResult.meta
      ? cardsResult.meta
      : { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  return (
    <CardsClientPage
      initialCards={cards as LearningCardAdmin[]}
      referenciels={referenciels}
      niveaux={niveaux.map((n) => n.niveau)}
      meta={meta}
      search={search}
      filters={filters}
    />
  );
}
