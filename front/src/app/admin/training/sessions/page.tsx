import { getAllSessions } from "../actions";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./components/columns";
import { SessionDialog } from "./components/session-dialog";

export default async function SessionsPage() {
  const sessions = await getAllSessions();

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
        <SessionDialog>
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Session
          </Button>
        </SessionDialog>
      </div>

      <DataTable
        columns={columns}
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
