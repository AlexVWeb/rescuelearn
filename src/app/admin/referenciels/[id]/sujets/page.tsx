import { notFound } from "next/navigation";
import { getReferencielAnalysisAction } from "@/app/actions/referenciel-topic-actions";
import { requireSuperAdmin } from "@/lib/context";
import ClientPage from "./client-page";

// Le bouton « Ré-analyser » lance l'analyse IA en arrière-plan (after)
export const maxDuration = 800;

export default async function ReferencielTopicsPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await props.params;
  const referencielId = Number(id);
  if (!Number.isInteger(referencielId)) notFound();

  const result = await getReferencielAnalysisAction(referencielId);
  if (!result.success) notFound();

  return <ClientPage analysis={result.data} />;
}
