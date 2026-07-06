import { getAllTrainees } from "../actions";
import { Button } from "@/components/ui/button";
import { UserPlus, FileUp } from "lucide-react";
import { TraineeDialog } from "./components/trainee-dialog";
import { TraineeImportDialog } from "./components/trainee-import-dialog";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./components/columns";

export default async function StagiairesPage() {
  const trainees = await getAllTrainees();

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Base Stagiaires
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez tous les stagiaires enregistrés par votre organisme.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <TraineeImportDialog>
            <Button variant="outline" className="w-full sm:w-auto">
              <FileUp className="mr-2 h-4 w-4" /> Importer CSV
            </Button>
          </TraineeImportDialog>
          <TraineeDialog>
            <Button className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" /> Ajouter Stagiaire
            </Button>
          </TraineeDialog>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={trainees}
        searchKey="lastName"
        searchPlaceholder="Rechercher par nom..."
        visibilityStorageKey="stagiaires-columns"
      />
    </div>
  );
}
