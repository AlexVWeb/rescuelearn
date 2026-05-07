import {
  getReferencielsAction,
  Referenciel,
} from "@/app/actions/referenciel-actions";
import ClientPage from "./client-page";

export default async function ReferencielsPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const result = await getReferencielsAction(page, 100, search);
  const referenciels: Referenciel[] =
    result.success && result.data ? result.data : [];

  return <ClientPage initialReferenciels={referenciels} />;
}
