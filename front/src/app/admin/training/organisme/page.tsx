import { notFound } from "next/navigation";
import {
  getMyOrganismeAction,
  getOrganismeMembersAction,
} from "@/app/actions/organisme-actions";
import { OrganismeDetailClient } from "@/app/admin/organismes/[id]/organisme-detail-client";

export default async function MonOrganismePage() {
  const organismeResult = await getMyOrganismeAction();

  if (!organismeResult.success || !organismeResult.data) {
    notFound();
  }

  const organisme = organismeResult.data;
  const membersResult = await getOrganismeMembersAction(organisme.id);
  const members =
    membersResult.success && membersResult.data ? membersResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon organisme</h1>
        <p className="text-muted-foreground text-sm">{organisme.name}</p>
      </div>

      <OrganismeDetailClient organisme={organisme} members={members} />
    </div>
  );
}
