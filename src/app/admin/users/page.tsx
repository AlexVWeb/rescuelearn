import { getUsersAction } from "@/app/actions/user-actions";
import ClientPage from "./client-page"; // We need a client wrapper for state

export default async function UsersPage(props: {
  searchParams?: Promise<{ page?: string; search?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const search = searchParams?.search || "";

  const result = await getUsersAction(page, 100, search);
  const users = result.success && result.data ? result.data : [];

  return <ClientPage initialUsers={users} />;
}
