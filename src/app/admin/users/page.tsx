import { getUsersAction } from "@/app/actions/user-actions";
import ClientPage from "./client-page"; // We need a client wrapper for state
import { requireSuperAdmin } from "@/lib/context";

export default async function UsersPage(props: {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  await requireSuperAdmin();
  const searchParams = await props.searchParams;
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const search = searchParams?.search || "";
  const role = searchParams?.role || "all";
  const status = searchParams?.status || "all";
  const sortBy =
    (searchParams?.sortBy as "name" | "email" | "createdAt") || "createdAt";
  const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "desc";

  const result = await getUsersAction(
    page,
    limit,
    search,
    role,
    status,
    sortBy,
    sortOrder
  );

  const users = result.success && result.data ? result.data : [];
  const meta =
    result.success && result.meta
      ? result.meta
      : { total: 0, page: 1, limit, totalPages: 1 };

  return <ClientPage initialUsers={users} meta={meta} />;
}
