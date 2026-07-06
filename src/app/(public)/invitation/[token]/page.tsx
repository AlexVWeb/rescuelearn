import { getInvitationAction } from "@/app/actions/invitation.actions";
import { notFound } from "next/navigation";
import { AcceptInvitationForm } from "./accept-invitation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeartPulse } from "lucide-react";
import Link from "next/link";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitationAction(token);

  if (!result.success || !result.data) {
    notFound();
  }

  const invitation = result.data;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white p-4">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 rounded-xl p-1 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
        aria-label="Retour à l'accueil RescueLearn"
      >
        <div className="rounded-xl bg-blue-600 p-2 shadow-lg shadow-blue-200">
          <HeartPulse className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-blue-900">
          RescueLearn
        </span>
      </Link>

      <Card className="w-full max-w-md overflow-hidden border-none bg-white/80 shadow-2xl shadow-blue-100 backdrop-blur-sm">
        <div className="h-2 w-full bg-blue-600" aria-hidden="true" />
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-bold">
            <h1 className="text-2xl font-bold">Bienvenue</h1>
          </CardTitle>
          <CardDescription className="text-base">
            Vous avez été invité à rejoindre <br />
            <span className="text-lg font-semibold text-blue-700">
              {invitation.organization.name}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInvitationForm token={token} email={invitation.email} />
        </CardContent>
      </Card>

      <footer className="text-muted-foreground mt-8 text-sm">
        <p>
          &copy; {new Date().getFullYear()} RescueLearn. Tous droits réservés.
        </p>
      </footer>
    </main>
  );
}
