import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Flame, Star, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlayerInfoCard } from "./components/PlayerInfoCard";
import { PlayerPasswordCard } from "./components/PlayerPasswordCard";
import { PlayerPasskeysCard } from "./components/PlayerPasskeysCard";

export default async function PlayerProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      xp: true,
      streak: true,
    },
  });
  if (!user) redirect("/login");

  // Les comptes élèves sont créés avec un nom complet seul : on le découpe
  // pour pré-remplir prénom / nom tant qu'ils n'ont pas été renseignés.
  const [firstFromName = "", ...restOfName] = (user.name ?? "").split(" ");
  const firstName = user.firstName ?? firstFromName;
  const lastName = user.lastName ?? restOfName.join(" ");
  const displayName = user.name || user.email;

  return (
    <div className="animate-fade-in mx-auto max-w-5xl py-2 md:py-4">
      <section
        className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-xl md:p-8"
        aria-label="Mon profil"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black shadow-inner backdrop-blur-md">
            {displayName.charAt(0).toUpperCase() || (
              <UserRound className="h-8 w-8" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl">
              {displayName}
            </h1>
            <p className="text-xs font-extrabold tracking-wider text-blue-200 uppercase">
              Élève depuis{" "}
              {user.createdAt.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <Flame className="h-5 w-5 fill-current text-orange-400" />
            <span className="text-sm font-black">{user.streak} J</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <Star className="h-5 w-5 fill-current text-yellow-400" />
            <span className="text-sm font-black">{user.xp} XP</span>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PlayerInfoCard user={{ firstName, lastName, email: user.email }} />
          <PlayerPasskeysCard />
        </div>
        <PlayerPasswordCard email={user.email} />
      </div>
    </div>
  );
}
