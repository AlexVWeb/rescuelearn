import { Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AttestationState } from "@/lib/trainee-attestation";

const MESSAGES: Record<Exclude<AttestationState, "available">, string> = {
  pending:
    "Votre attestation sera disponible ici après la clôture de la session.",
  // Jamais le résultat brut : l'organisme accompagne le stagiaire
  contact: "Votre organisme vous contactera concernant votre attestation.",
};

export function AttestationCard({
  inscriptionId,
  state,
}: {
  inscriptionId: string;
  state: AttestationState;
}) {
  return (
    <section aria-labelledby="attestation-title" className="space-y-3">
      <h2 id="attestation-title" className="text-lg font-semibold">
        Attestation
      </h2>
      <div className="bg-card flex items-start gap-3 rounded-xl border p-4">
        <Award
          className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        {state === "available" ? (
          <div className="space-y-3">
            <p className="text-sm">Votre attestation est disponible.</p>
            <Button asChild>
              <a
                href={`/espace/sessions/${inscriptionId}/attestation`}
                download
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Télécharger mon attestation (PDF)
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{MESSAGES[state]}</p>
        )}
      </div>
    </section>
  );
}
