import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Users, Award, TrendingUp } from "lucide-react";
import { SessionChart, PresenceChart } from "./charts";

interface StatsGridProps {
  stats: {
    sessions: {
      total: number;
      increase: number;
      chartData: { name: string; total: number }[];
    };
    trainees: {
      total: number;
      increase: number;
    };
    successRate: {
      percentage: number;
      year: number;
    };
    presence: {
      percentage: number;
      days: number;
    };
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Statistiques clés"
    >
      {/* Card 1: Sessions à venir */}
      <Card className="group relative flex h-40 flex-col justify-between overflow-hidden border-none bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="relative z-10 pb-0">
          <CardDescription className="font-semibold text-blue-100/90">
            Sessions à venir
          </CardDescription>
          <CardTitle className="mt-1 text-5xl font-extrabold tracking-tight">
            {stats.sessions.total}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 px-0 pb-0">
          <div className="mb-2 flex items-center gap-1.5 px-4 text-xs font-semibold text-blue-100">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
              <TrendingUp className="h-2.5 w-2.5" />
            </div>
            <span>+{stats.sessions.increase} ce mois</span>
          </div>
          <div className="h-14 w-full opacity-80 transition-opacity group-hover:opacity-100">
            <SessionChart data={stats.sessions.chartData} />
          </div>
        </CardContent>
        <Calendar
          className="absolute -top-6 -right-6 h-32 w-32 text-white/10 transition-transform group-hover:scale-110 group-hover:rotate-12"
          aria-hidden="true"
        />
      </Card>

      {/* Card 2: Stagiaires formés */}
      <Card className="group relative flex h-40 flex-col justify-between overflow-hidden border-none bg-gradient-to-br from-cyan-700 to-cyan-900 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="relative z-10 pb-0">
          <CardDescription className="font-semibold text-cyan-100/90">
            Stagiaires formés
          </CardDescription>
          <CardTitle className="mt-1 text-5xl font-extrabold tracking-tight">
            {stats.trainees.total}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 px-4 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-100">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
              <TrendingUp className="h-2.5 w-2.5" />
            </div>
            <span>+{stats.trainees.increase} ce mois</span>
          </div>
        </CardContent>
        <Users
          className="absolute -top-6 -right-6 h-32 w-32 text-white/10 transition-transform group-hover:scale-110 group-hover:rotate-12"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)]" />
      </Card>

      {/* Card 3: Taux de réussite */}
      <Card className="group relative flex h-40 flex-col justify-between overflow-hidden border-none bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="relative z-10 pb-0">
          <CardDescription className="font-semibold text-slate-400">
            Taux de réussite
          </CardDescription>
          <CardTitle className="mt-1 text-5xl font-extrabold tracking-tight">
            {stats.successRate.percentage}%
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 px-4 pb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white">
              <TrendingUp className="h-2.5 w-2.5" />
            </div>
            <span>Année {stats.successRate.year}</span>
          </div>
        </CardContent>
        <Award
          className="absolute -top-6 -right-6 h-32 w-32 text-white/5 transition-transform group-hover:scale-110 group-hover:rotate-12"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:20px_20px]" />
      </Card>

      {/* Card 4: Absences */}
      <Card className="group bg-card relative flex h-40 flex-col justify-between overflow-hidden border shadow-md transition-all hover:-translate-y-1 hover:shadow-lg">
        <CardHeader className="pb-0">
          <CardDescription className="font-semibold text-slate-500">
            Absences (30j)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 px-4 pb-4">
          <div className="flex flex-col">
            <span className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {stats.presence.percentage}%
            </span>
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              présence
            </span>
          </div>
          <div className="h-20 w-20 shrink-0 transition-transform group-hover:scale-105">
            <PresenceChart percentage={stats.presence.percentage} />
          </div>
        </CardContent>
        <div className="bg-primary absolute bottom-0 h-1 w-full" />
      </Card>
    </section>
  );
}
