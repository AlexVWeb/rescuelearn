import { getScenariosAction, SNVScenario } from "@/app/actions/snv-actions";
import { getAllReferencielsSimpleAction } from "@/app/actions/quiz-actions";
import ScenariosClientPage from "./client-page";
import { requireSuperAdmin } from "@/lib/context";

export default async function ScenariosPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const [scenariosResult, referenciels] = await Promise.all([
    getScenariosAction(page, 100, search),
    getAllReferencielsSimpleAction(),
  ]);

  const scenarios = scenariosResult.success ? scenariosResult.data : [];

  return (
    <ScenariosClientPage
      initialScenarios={scenarios as SNVScenario[]}
      referenciels={referenciels}
    />
  );
}
