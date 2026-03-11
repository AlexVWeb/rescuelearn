import { getOrganismesAction } from "@/app/actions/organisme-actions";
import ClientPage from "./client-page";

export default async function OrganismesPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const result = await getOrganismesAction(page, 100, search);
  const organismes = (result.success && result.data) ? result.data : [];

  return <ClientPage initialOrganismes={organismes} />;
}
