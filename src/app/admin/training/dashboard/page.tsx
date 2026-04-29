import {
  getUpcomingSessions,
  getMonOrganisme,
  getDashboardStats,
} from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SessionChart, PresenceChart } from "./_components/charts";
import {
  Calendar,
  Users,
  Award,
  TrendingUp,
  ChevronRight,
  Target,
} from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export default async function DashboardPage() {
  const [upcomingSessions, organisme, stats] = await Promise.all([
    getUpcomingSessions(),
    getMonOrganisme(),
    getDashboardStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Bienvenue sur votre espace de gestion (Organisme : {organisme?.name}
            )
          </p>
        </div>
        {organisme && (
          <div className="bg-card hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-2 pr-4 shadow-sm transition-colors">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
                <Target className="text-primary h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] leading-none font-medium uppercase">
                  Code Invitation Formateurs
                </p>
                <p className="font-mono text-sm leading-none font-bold">
                  {organisme.inviteCode}
                </p>
              </div>
            </div>
            <CopyButton value={organisme.inviteCode} />
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Sessions à venir */}
        <Card className="group relative h-40 overflow-hidden border-none bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
          <CardHeader className="relative z-10 pb-0">
            <CardDescription className="font-medium text-blue-100/80">
              Sessions à venir
            </CardDescription>
            <CardTitle className="text-5xl font-extrabold tracking-tight">
              {stats.sessions.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-1 flex-col justify-end px-0 pb-0">
            <div className="mb-2 flex items-center gap-1.5 px-4 text-xs font-semibold text-blue-100">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <TrendingUp className="h-2.5 w-2.5" />
              </div>
              <span>+{stats.sessions.increase} ce mois</span>
            </div>
            <div className="h-16 w-full opacity-80 transition-opacity group-hover:opacity-100">
              <SessionChart data={stats.sessions.chartData} />
            </div>
          </CardContent>
          <Calendar className="absolute -top-6 -right-6 h-32 w-32 text-white/10 transition-transform group-hover:scale-110 group-hover:rotate-12" />
        </Card>

        {/* Card 2: Stagiaires formés */}
        <Card className="group relative h-40 overflow-hidden border-none bg-gradient-to-br from-cyan-700 to-blue-900 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
          <CardHeader className="relative z-10 pb-0">
            <CardDescription className="font-medium text-blue-100/80">
              Stagiaires formés
            </CardDescription>
            <CardTitle className="text-5xl font-extrabold tracking-tight">
              {stats.trainees.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex h-full flex-col justify-end px-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                <TrendingUp className="h-2.5 w-2.5" />
              </div>
              <span>+{stats.trainees.increase} ce mois</span>
            </div>
          </CardContent>
          <Users className="absolute -top-6 -right-6 h-32 w-32 text-white/10 transition-transform group-hover:scale-110 group-hover:rotate-12" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)]" />
        </Card>

        {/* Card 3: Taux de réussite */}
        <Card className="group relative h-40 overflow-hidden border-none bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
          <CardHeader className="relative z-10 pb-0">
            <CardDescription className="font-medium text-slate-400">
              Taux de réussite
            </CardDescription>
            <CardTitle className="text-5xl font-extrabold tracking-tight">
              {stats.successRate.percentage}%
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex h-full flex-col justify-end px-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white">
                <TrendingUp className="h-2.5 w-2.5" />
              </div>
              <span>Année {stats.successRate.year}</span>
            </div>
          </CardContent>
          <Award className="absolute -top-6 -right-6 h-32 w-32 text-white/5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:20px_20px]" />
        </Card>

        {/* Card 4: Absences */}
        <Card className="group relative h-40 overflow-hidden shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
          <CardHeader className="pb-0">
            <CardDescription className="text-muted-foreground font-medium">
              Absences (30j)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-between gap-2 px-4 pb-4">
            <div className="flex flex-col">
              <span className="text-5xl font-extrabold tracking-tight">
                {stats.presence.percentage}%
              </span>
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                présence
              </span>
            </div>
            <div className="h-20 w-20 shrink-0 transition-transform group-hover:scale-105">
              <PresenceChart percentage={stats.presence.percentage} />
            </div>
          </CardContent>
          <div className="absolute bottom-0 h-1 w-full bg-blue-600" />
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Prochaines Sessions</h2>
          {upcomingSessions.length > 0 && (
            <Link
              href="/admin/training/sessions"
              className="group flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              Voir tout
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {upcomingSessions.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="text-muted-foreground/50 mb-4 h-10 w-10" />
              <p className="text-lg font-medium">Aucune session planifiée</p>
              <p className="text-muted-foreground text-sm">
                Vous n'avez pas encore de sessions de formation à venir.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.map((session) => (
              <Card
                key={session.id}
                className="group hover:ring-primary/20 relative overflow-hidden transition-all hover:shadow-lg hover:ring-1"
              >
                <div className="from-primary/50 to-primary absolute top-0 h-1 w-full bg-gradient-to-r transition-all group-hover:h-1.5" />
                <CardHeader className="pt-6 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-lg font-bold">
                      {session.title}
                    </CardTitle>
                    <span className="bg-primary/10 text-primary shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                      {session.type}
                    </span>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                    <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                    <span>
                      {session.startDate
                        ? dayjs(session.startDate).format("DD/MM/YYYY")
                        : "Date non fixée"}
                    </span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>{session.location}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Taux d'occupation
                      </span>
                      <span className="font-bold">
                        {session._count.inscriptions} / {session.maxTrainees}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 p-[1px]">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.min(
                            100,
                            (session._count.inscriptions /
                              session.maxTrainees) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
