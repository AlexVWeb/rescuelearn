import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true, email: true },
  });

  if (!user) redirect("/");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-muted-foreground text-sm">
          Gérez vos informations personnelles.
        </p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
