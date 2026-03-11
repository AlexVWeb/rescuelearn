import { getSessionDetails, getAllTrainees } from "../../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { SlotsTab } from "./components/slots-tab";
import { InscriptionsTab } from "./components/inscriptions-tab";
import { EmargementTab } from "./components/emargement-tab";

export default async function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let session;
  let allTrainees;
  try {
    session = await getSessionDetails(id);
    allTrainees = await getAllTrainees();
  } catch (e) {
    return notFound();
  }

  // We need to type this safely, the real type includes slots and inscriptions.
  const slots = session.slots || [];
  const inscriptions = session.inscriptions || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{session.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{session.type}</Badge>
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {session.location}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {inscriptions.length} / {session.maxTrainees} inscrits</span>
            <Badge variant={session.status === "terminée" ? "default" : "outline"}>{session.status}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="slots" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="slots">Programme (Créneaux)</TabsTrigger>
          <TabsTrigger value="inscriptions">Stagiaires ({inscriptions.length})</TabsTrigger>
          <TabsTrigger value="emargement">Émargements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="slots" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organisation des demi-journées</CardTitle>
              <CardDescription>
                Définissez les créneaux horaires (slots) de cette session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SlotsTab sessionId={session.id} slots={slots} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inscriptions" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Inscrits</CardTitle>
              <CardDescription>
                Inscrivez des stagiaires à cette session. ({inscriptions.length} sur {session.maxTrainees} places)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InscriptionsTab 
                sessionId={session.id} 
                inscriptions={inscriptions} 
                allTrainees={allTrainees} 
                maxTrainees={session.maxTrainees} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emargement" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feuille d'émargement</CardTitle>
              <CardDescription>
                Gérez les présences pour chaque créneau de formation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmargementTab 
                sessionId={session.id} 
                sessionTitle={session.title} 
                sessionLocation={session.location}
                sessionType={session.type}
                slots={slots} 
                inscriptions={inscriptions} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
