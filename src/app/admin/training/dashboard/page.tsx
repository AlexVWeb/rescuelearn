import {
  getUpcomingSessions,
  getMonOrganisme,
  getDashboardStats,
} from "../actions";
import { StatsGrid } from "./_components/stats-grid";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { UpcomingSessionsList } from "./_components/upcoming-sessions-list";
import { MiniCalendar } from "./_components/mini-calendar";
import { InviteCard } from "./_components/invite-card";
import { TrainerTeam } from "./_components/trainer-team";
import { Calendar } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [upcomingSessions, organisme, stats] = await Promise.all([
    getUpcomingSessions(),
    getMonOrganisme(),
    getDashboardStats(),
  ]);

  return (
    <main
      className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8"
      aria-label="Tableau de bord de formation"
    >
      {/* Welcome & Context Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Bonjour, {stats.userName} 👋
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Espace de gestion —{" "}
            <span className="font-semibold">{organisme?.name}</span>
          </p>
        </div>

        {/* Quick Session CTA */}
        <Link
          href="/admin/training/sessions"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Créer une nouvelle session de formation"
        >
          + Nouvelle session
        </Link>
      </header>

      {/* KPI Stats Cards Grid */}
      <StatsGrid stats={stats} />

      {/* Checklist "Premiers Pas" */}
      <OnboardingChecklist checklist={stats.checklist} />

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Upcoming Sessions (70%) */}
        <UpcomingSessionsList sessions={upcomingSessions} />

        {/* Right Column: Invite, Planning, Trainers (30%) */}
        <aside className="space-y-6" aria-label="Outils et équipe">
          {/* Trainer Invitation Widget */}
          <InviteCard organisme={organisme} />

          {/* Calendar/Planning Widget */}
          <section aria-label="Planning mensuel">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase">
              <Calendar className="h-4 w-4" />
              Planning
            </h2>
            <MiniCalendar calendarEvents={stats.calendarEvents} />
          </section>

          {/* Trainer Team Widget */}
          <TrainerTeam trainers={stats.trainers} />
        </aside>
      </div>
    </main>
  );
}
