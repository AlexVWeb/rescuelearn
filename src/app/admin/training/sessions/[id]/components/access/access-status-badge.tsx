import { Badge } from "@/components/ui/badge";
import {
  getAccessStatus,
  type AccessStatus,
} from "@/app/admin/training/lib/access-status";
import type { Inscription } from "@/app/admin/training/types";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
});

function label(status: AccessStatus, inscription: Inscription) {
  switch (status) {
    case "opened":
      return `Espace ouvert · ${dayFormat.format(new Date(inscription.accessLastUsedAt!))}`;
    case "sent":
      return `Envoyé · ${dayFormat.format(new Date(inscription.accessSentAt!))}`;
    case "link_created":
      return "Lien créé";
    case "no_email":
      return "Pas d'email";
    case "not_sent":
      return "Non envoyé";
  }
}

const VARIANT: Record<
  AccessStatus,
  "success" | "outline" | "warning" | "secondary"
> = {
  opened: "success",
  sent: "outline",
  link_created: "outline",
  no_email: "warning",
  not_sent: "secondary",
};

export function AccessStatusBadge({
  inscription,
}: {
  inscription: Inscription;
}) {
  const status = getAccessStatus(inscription);
  return (
    <Badge variant={VARIANT[status]}>
      <span className="sr-only">Espace stagiaire : </span>
      {label(status, inscription)}
    </Badge>
  );
}
