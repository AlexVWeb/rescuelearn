import { getAllSessions, getEvaluationQuality } from "../actions";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  columns,
  columnsWithoutSatisfaction,
  type SessionRow,
} from "./components/columns";
import { TrainingSession } from "../types";
import Link from "next/link";
import { requireOrganisme } from "@/lib/context";
import { isModuleActive } from "@/lib/organisme-modules/service";

export default async function SessionsPage() {
  const user = await requireOrganisme();
  const [allSessions, quality, evaluationActive] = await Promise.all([
    getAllSessions(),
    getEvaluationQuality(),
    isModuleActive(user.organismeId, "evaluation"),
  ]);
  const sessions: SessionRow[] = (
    allSessions as unknown as TrainingSession[]
  ).map((session) => ({
    ...session,
    satisfaction: quality.bySession[session.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Sessions de Formation
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez toutes les sessions de votre organisme.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/training/sessions/new">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Session
          </Link>
        </Button>
      </div>

      <DataTable
        columns={evaluationActive ? columns : columnsWithoutSatisfaction}
        data={sessions}
        searchKey="title"
        searchPlaceholder="Rechercher par titre..."
      />

      {sessions.length === 0 && (
        <div className="bg-muted/20 rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucune session trouvée. Commencez par en créer une.
          </p>
        </div>
      )}
    </div>
  );
}
