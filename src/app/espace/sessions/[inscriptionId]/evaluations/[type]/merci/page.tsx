import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvaluationWindow } from "@/lib/evaluation/window";
import { RESPONSE_STATUS } from "@/lib/evaluation/service";
import { EspaceHeader } from "../../../../../components/espace-header";
import { formatParisDay } from "../../../../../lib/format";
import { loadEvaluation } from "../load";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Merci pour vos réponses · Mon espace de formation",
};

export default async function EvaluationThanksPage({
  params,
}: {
  params: Promise<{ inscriptionId: string; type: string }>;
}) {
  const { inscriptionId, type } = await params;
  const { inscription, context, window } = await loadEvaluation(
    inscriptionId,
    type
  );
  const evaluationUrl = `/espace/sessions/${inscription.id}/evaluations/${context.type}`;
  if (context.response?.status !== RESPONSE_STATUS.SOUMISE) {
    redirect(evaluationUrl);
  }

  // Fin de session retrouvée depuis la fenêtre à chaud (ouverte à la fin)
  const coldOpensAt =
    context.type === "chaud"
      ? getEvaluationWindow("froid", window.opensAt).opensAt
      : null;

  return (
    <>
      <EspaceHeader organisme={inscription.trainingSession.organisme} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="bg-card space-y-4 rounded-xl border p-6 text-center">
          <CheckCircle2
            className="text-success mx-auto h-12 w-12"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold">
            Merci, vos réponses sont envoyées
          </h1>
          <p className="text-muted-foreground">
            Vous pouvez encore les modifier jusqu&apos;au{" "}
            {formatParisDay(window.closesAt)}.
          </p>
          {coldOpensAt && (
            <p className="text-muted-foreground">
              Une seconde évaluation, plus courte, vous sera proposée à partir
              du {formatParisDay(coldOpensAt)} pour savoir ce que vous avez
              retenu et utilisé.
            </p>
          )}
          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Button asChild className="h-12">
              <Link href={`/espace/sessions/${inscription.id}`}>
                Retour à ma formation
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link href={evaluationUrl}>Revoir mes réponses</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
