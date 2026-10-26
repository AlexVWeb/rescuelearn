import Link from "next/link";
import { AlertTriangle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { federationLabel } from "@/lib/documents/federations";
import {
  buildTemplateRequestMailto,
  missingDocumentLabels,
  TEMPLATE_DELIVERY_DAYS,
  type DocumentOrganisme,
} from "@/lib/documents/registry";

/**
 * Fédération sans modèles intégrés : seuls les documents communs sont
 * proposés, on invite l'organisme à nous transmettre les siens.
 */
export function MissingTemplatesAlert({
  organisme,
}: {
  organisme: DocumentOrganisme;
}) {
  const label = federationLabel(organisme.federation, organisme.federationName);
  const missing = missingDocumentLabels(organisme.federation);

  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {label
          ? `Modèles ${label} non disponibles`
          : "Fédération non renseignée"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {label
            ? "Certains documents propres à votre fédération"
            : "Les documents propres à une fédération"}{" "}
          ({missing.join(", ")}) ne sont pas encore générés par RescueLearn.
          Contactez l&apos;administrateur en lui envoyant vos modèles : ils
          seront intégrés sous {TEMPLATE_DELIVERY_DAYS} jours ouvrés maximum.
        </p>
        {!organisme.federation && (
          <p>
            Renseignez aussi votre fédération dans les{" "}
            <Link
              href="/admin/training/organisme"
              className="font-medium underline underline-offset-4"
            >
              paramètres de l&apos;organisme
            </Link>
            .
          </p>
        )}
        <Button asChild size="sm" variant="outline">
          <a href={buildTemplateRequestMailto(organisme)}>
            <Mail className="mr-2 h-4 w-4" />
            Envoyer mes modèles
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
