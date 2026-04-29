import { getScenariosAction } from "@/app/actions/snv-actions";
import ScenariosClientPage from "./client-page";

export default async function ScenariosPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const result = await getScenariosAction(page, 100, search); // Fetch 100 for now
  const scenarios = result.success ? result.data : [];

  return <ScenariosClientPage initialScenarios={scenarios as any} />;
}
