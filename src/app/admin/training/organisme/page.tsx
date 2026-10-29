import { notFound } from "next/navigation";
import { getLogoAsBase64 } from "@/lib/organisme-logo";
import { getMyOrganismeAction } from "@/app/actions/organisme.actions";
import { getOrganismeMembersAction } from "@/app/actions/members.actions";
import { getPendingInvitationsAction } from "@/app/actions/invitation.actions";
import { getOrganismeModules } from "@/lib/organisme-modules/service";
import { OrganismeDetailClient } from "@/app/admin/organismes/[id]/organisme-detail-client";
import { getWelcomeSettings } from "@/app/admin/training/actions";
import { WelcomeSettings } from "./components/welcome-settings";

export default async function MonOrganismePage() {
  const organismeResult = await getMyOrganismeAction();

  if (!organismeResult.success || !organismeResult.data) {
    notFound();
  }

  const organisme = organismeResult.data;
  const logoBase64 = await getLogoAsBase64(organisme.logo);
  const modules = await getOrganismeModules(organisme.id);
  const welcome = await getWelcomeSettings();
  const membersResult = await getOrganismeMembersAction();
  const members =
    membersResult.success && membersResult.data ? membersResult.data : [];

  const invitationsResult = await getPendingInvitationsAction(organisme.id);
  const invitations =
    invitationsResult.success && invitationsResult.data
      ? invitationsResult.data.map((inv) => ({
          ...inv,
          role: inv.role || "FORMATEUR",
        }))
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon organisme</h1>
        <p className="text-muted-foreground text-sm">{organisme.name}</p>
      </div>

      <OrganismeDetailClient
        organisme={organisme}
        members={members}
        invitations={invitations}
        logoBase64={logoBase64}
        modules={modules}
        canManageAvailability={false}
        welcomeTab={<WelcomeSettings {...welcome} />}
      />
    </div>
  );
}
