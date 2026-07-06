import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, ChevronRight, MapPin } from "lucide-react";
import dayjs from "dayjs";

interface SessionData {
  id: string;
  title: string;
  type: string;
  location: string;
  startDate: Date | null;
  maxTrainees: number;
  _count: {
    inscriptions: number;
  };
}

interface UpcomingSessionsListProps {
  sessions: SessionData[];
}

export function UpcomingSessionsList({ sessions }: UpcomingSessionsListProps) {
  return (
    <section
      className="space-y-6 lg:col-span-2"
      aria-label="Prochaines Sessions de Formation"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Prochaines sessions
        </h2>
        {sessions.length > 0 && (
          <Link
            href="/admin/training/sessions"
            className="group text-primary hover:text-primary/95 inline-flex items-center gap-1 text-sm font-bold transition-colors"
          >
            Voir tout
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <Card className="bg-muted/30 border-dashed py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center">
            <CalendarIcon
              className="mb-4 h-12 w-12 text-slate-400"
              aria-hidden="true"
            />
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Aucune session planifiée
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Créez des sessions pour démarrer l'émargement et le suivi de vos
              stagiaires.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const filledRatio =
              session.maxTrainees > 0
                ? Math.min(
                    100,
                    (session._count.inscriptions / session.maxTrainees) * 100
                  )
                : 0;
            const isFull = session._count.inscriptions >= session.maxTrainees;

            return (
              <Card
                key={session.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  {/* Left Block: Basic Details */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          isFull
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {isFull ? "Complet" : "Ouvert"}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-800 uppercase dark:bg-slate-800 dark:text-slate-200">
                        {session.type}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {session.location}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {session.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      {session.startDate
                        ? dayjs(session.startDate).format("DD MMMM YYYY")
                        : "Date non fixée"}
                    </p>
                  </div>

                  {/* Right Block: Occupation & Progress */}
                  <div className="w-full shrink-0 space-y-1.5 sm:w-48">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Remplissage</span>
                      <span className="text-slate-900 dark:text-white">
                        {session._count.inscriptions} / {session.maxTrainees}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull ? "bg-green-600" : "bg-primary"
                        }`}
                        style={{ width: `${filledRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
