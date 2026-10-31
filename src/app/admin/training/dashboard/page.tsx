import Link from "next/link";
import { Plus } from "lucide-react";
import {
  getUpcomingSessions,
  getMonOrganisme,
  getDashboardStats,
  getDashboardAgenda,
  getEvaluationQuality,
} from "../actions";
import { sortByStartDate } from "../lib/dashboard-agenda";
import { Button } from "@/components/ui/button";
import { requireOrganisme } from "@/lib/context";
import { isModuleActive } from "@/lib/organisme-modules/service";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { WeekAgenda, type NextSessionHint } from "./_components/week-agenda";
import { TodoPanel } from "./_components/todo-panel";
import { KeyFigures } from "./_components/key-figures";
import { UpcomingSessionsList } from "./_components/upcoming-sessions-list";
import { MiniCalendar } from "./_components/mini-calendar";
import { TrainerTeam } from "./_components/trainer-team";
import { QualityCard } from "./_components/quality-card";
import { InviteCode } from "./_components/invite-code";
import { SectionHeading } from "./_components/section-heading";

export const dynamic = "force-dynamic";

const todayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

export default async function DashboardPage() {
  const user = await requireOrganisme();
  const [upcoming, organisme, stats, agenda, quality, evaluationActive] =
    await Promise.all([
      getUpcomingSessions(),
      getMonOrganisme(),
      getDashboardStats(),
      getDashboardAgenda(),
      getEvaluationQuality(),
      isModuleActive(user.organismeId, "evaluation"),
    ]);

  const today = new Date(`${agenda.todayKey}T00:00:00Z`);
  // Les sessions dont le dernier jour est passé sont dans « À faire »
  const sessions = sortByStartDate(
    upcoming.filter((session) => !session.endDate || session.endDate >= today)
  );
  const nextSession: NextSessionHint | null =
    sessions.flatMap((session) =>
      session.startDate && session.startDate >= today
        ? [
            {
              id: session.id,
              title: session.title,
              startDate: session.startDate,
            },
          ]
        : []
    )[0] ?? null;

  return (
    <main
      className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8"
      aria-label="Tableau de bord de l'organisme"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm first-letter:uppercase">
            {todayFormat.format(new Date())}
          </p>
          <h1 className="text-foreground mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Bonjour {stats.userName}
          </h1>
          {organisme && (
            <p className="text-muted-foreground mt-0.5">{organisme.name}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {organisme && <InviteCode code={organisme.inviteCode} />}
          <Button asChild>
            <Link href="/admin/training/sessions/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Créer une session
            </Link>
          </Button>
        </div>
      </header>

      <OnboardingChecklist checklist={stats.checklist} />

      {/* Le temps d'abord : la semaine à gauche, le mois et les actions à droite */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WeekAgenda week={agenda.week} nextSession={nextSession} />
          <KeyFigures stats={stats} />
        </div>

        <div className="space-y-6">
          <TodoPanel todos={agenda.todos} />
          <section aria-labelledby="planning-title">
            <SectionHeading id="planning-title" title="Planning du mois" />
            <MiniCalendar calendarEvents={stats.calendarEvents} />
          </section>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <UpcomingSessionsList sessions={sessions} className="lg:col-span-2" />

        <aside className="space-y-8" aria-label="Avis des stagiaires et équipe">
          {evaluationActive && <QualityCard overview={quality.overview} />}
          <TrainerTeam trainers={stats.trainers} teamSize={stats.teamSize} />
        </aside>
      </div>
    </main>
  );
}
