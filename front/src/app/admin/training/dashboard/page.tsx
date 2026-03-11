import { getUpcomingSessions, getMonOrganisme } from "../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const upcomingSessions = await getUpcomingSessions();
  const organisme = await getMonOrganisme();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tableau de bord Formateur</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Bienvenue sur votre espace de gestion de la formation.
        </p>
        
        {organisme && (
          <div className="mt-4 p-4 border rounded-md bg-muted/30 inline-block">
            <p className="text-sm font-semibold mb-1">Votre Code d'Invitation (Organisme : {organisme.name})</p>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-background border rounded text-lg font-mono">{organisme.inviteCode}</code>
              <p className="text-xs text-muted-foreground">À partager aux nouveaux formateurs pour les rattacher à votre organisme lors de leur inscription.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Prochaines Sessions</h2>
        {upcomingSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session planifiée pour le moment.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <CardTitle>{session.title}</CardTitle>
                  <CardDescription>{session.type} - {session.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Inscrits : {session._count.inscriptions} / {session.maxTrainees}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
