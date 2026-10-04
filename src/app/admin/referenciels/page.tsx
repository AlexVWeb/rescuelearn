import {
  getReferencielsAction,
  Referenciel,
} from "@/app/actions/referenciel-actions";
import ClientPage from "./client-page";
import { requireSuperAdmin } from "@/lib/context";

// Les server actions de la page lancent l'analyse IA des référentiels en arrière-plan (after)
export const maxDuration = 800;

export default async function ReferencielsPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const result = await getReferencielsAction(page, 100, search);
  const referenciels: Referenciel[] =
    result.success && result.data ? result.data : [];

  return <ClientPage initialReferenciels={referenciels} />;
}
