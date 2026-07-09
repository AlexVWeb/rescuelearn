import React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasRole, UserRole } from "@/lib/roles";
import Link from "next/link";
import { LogOut, User as UserIcon, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      emailVerified: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const userRoles = (
    typeof dbUser.roles === "string" ? JSON.parse(dbUser.roles) : dbUser.roles
  ) as string[];

  // Vérifie si l'utilisateur possède le rôle PLAYER
  if (!hasRole(userRoles, UserRole.PLAYER)) {
    redirect("/");
  }

  // Vérifie si l'adresse email est validée
  if (!dbUser.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(dbUser.email)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
      {/* Header / Navbar */}
      <header
        className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm"
        role="banner"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/player"
              className="rounded-md px-2 py-1 text-xl font-bold text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              RescueLearn{" "}
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                Élève
              </span>
            </Link>
            <nav
              className="hidden items-center gap-4 md:flex"
              aria-label="Navigation principale"
            >
              <Link
                href="/player"
                className="flex items-center gap-2 rounded-md bg-blue-50/50 px-3 py-2 text-sm font-medium text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Trophy className="h-4 w-4" />
                Tableau de bord
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <UserIcon className="h-4 w-4" />
              </div>
              <span className="hidden text-sm font-medium text-gray-700 sm:inline-block">
                {dbUser.name}
              </span>
            </div>

            {/* Bouton de déconnexion utilisant un composant interactif léger */}
            <Link
              href="/api/auth/sign-out"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
