import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getOrganismeByIdAction,
  getOrganismeMembersAction,
} from "@/app/actions/organisme-actions";
import { OrganismeDetailClient } from "./organisme-detail-client";

export default async function OrganismeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [organismeResult, membersResult] = await Promise.all([
    getOrganismeByIdAction(id),
    getOrganismeMembersAction(id),
  ]);

  if (!organismeResult.success || !organismeResult.data) {
    notFound();
  }

  const organisme = organismeResult.data;
  const members =
    membersResult.success && membersResult.data ? membersResult.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/organismes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {organisme.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Code d&apos;invitation :{" "}
            <code className="bg-muted rounded px-1">
              {organisme.inviteCode}
            </code>
          </p>
        </div>
      </div>

      <OrganismeDetailClient organisme={organisme} members={members} />
    </div>
  );
}
