import { getAllTrainees } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Pencil } from "lucide-react";
import { TraineeDialog } from "./components/trainee-dialog";
import { DeleteTraineeButton } from "./components/delete-trainee-button";

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
        <TraineeDialog>
          <Button className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Ajouter Stagiaire
          </Button>
        </TraineeDialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainees.map((trainee) => (
          <Card key={trainee.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>
                {trainee.firstName} {trainee.lastName}
              </CardTitle>
              <div className="flex gap-1">
                <TraineeDialog trainee={trainee}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TraineeDialog>
                <DeleteTraineeButton traineeId={trainee.id} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Email : {trainee.email || "Non renseigné"}
              </p>
              <p className="text-sm">
                Téléphone : {trainee.phone || "Non renseigné"}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {trainee._count.inscriptions} Formation(s) suivie(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {trainees.length === 0 && (
        <div className="bg-muted/20 rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucun stagiaire trouvé. Ajoutez-en un pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}
