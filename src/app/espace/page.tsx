import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { checkInscriptionAccess } from "@/lib/trainee-access";
import { requireTrainee } from "@/lib/trainee-session";
import { EspaceHeader } from "./components/espace-header";
import { formatSessionDates } from "./lib/format";

export const dynamic = "force-dynamic";

export default async function EspacePage() {
  const access = await requireTrainee();

  // Toutes les sessions pour lesquelles ce stagiaire a reçu un lien encore valide
  const inscriptions = await prisma.inscription.findMany({
    where: { traineeId: access.traineeId, accessTokenHash: { not: null } },
    include: { trainee: true, trainingSession: true },
    orderBy: { trainingSession: { startDate: "desc" } },
  });
  const sessions = inscriptions.filter(
    (inscription) => !checkInscriptionAccess(inscription, null)
  );

  if (sessions.length === 1) redirect(`/espace/sessions/${sessions[0].id}`);

  const organisme = access.trainingSession.organisme;
  const firstName = access.trainee.firstName;

  return (
    <>
      <EspaceHeader organisme={organisme} />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {firstName ? `Bonjour ${firstName}` : "Mon espace de formation"}
          </h1>
          <p className="text-muted-foreground">
            Vos formations avec {organisme.name}
          </p>
        </div>

        <section aria-labelledby="sessions-title">
          <h2 id="sessions-title" className="sr-only">
            Mes formations
          </h2>
          <ul className="space-y-3">
            {sessions.map(({ id, trainingSession }) => (
              <li key={id}>
                <Link
                  href={`/espace/sessions/${id}`}
                  className="focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-[3px]"
                >
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-lg">
                        <h3>{trainingSession.title}</h3>
                      </CardTitle>
                      <ChevronRight
                        className="text-muted-foreground h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {formatSessionDates(
                          trainingSession.startDate,
                          trainingSession.endDate
                        )}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        {trainingSession.location}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
