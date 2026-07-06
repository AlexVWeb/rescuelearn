import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TrainerData {
  id: string;
  name: string;
  sessionsCount: number;
  role: string;
}

interface TrainerTeamProps {
  trainers: TrainerData[];
}

export function TrainerTeam({ trainers }: TrainerTeamProps) {
  return (
    <section aria-label="Équipe des formateurs">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase">
          <Users className="h-4 w-4" />
          Équipe formateurs
        </h2>
        <span className="text-xs font-semibold text-slate-500">
          {trainers.length} actifs
        </span>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="divide-y p-0">
          {trainers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Aucun formateur enregistré.
            </div>
          ) : (
            trainers.map((trainer) => (
              <div
                key={trainer.id}
                className="flex items-center justify-between gap-2 p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {trainer.name}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {trainer.role}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {trainer.sessionsCount} sessions
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
