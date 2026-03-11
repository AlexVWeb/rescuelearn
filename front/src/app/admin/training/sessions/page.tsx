import { getAllSessions } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Pencil } from "lucide-react";
import { DeleteSessionButton } from "./components/delete-session-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        <Button className="w-full sm:w-auto" asChild>
          <Link href="/admin/training/sessions/new">
            <Plus className="mr-2 h-4 w-4" /> Nouvelle Session
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>{session.title}</CardTitle>
                <CardDescription>
                  {session.type} - {session.location}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/training/sessions/${session.id}`}>
                    Gérer
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/admin/training/sessions/${session.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <DeleteSessionButton sessionId={session.id} sessionTitle={session.title} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Statut : <span className="font-medium">{session.status}</span>
              </p>
              <p className="text-sm">
                Inscrits : {session._count.inscriptions} / {session.maxTrainees}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

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
