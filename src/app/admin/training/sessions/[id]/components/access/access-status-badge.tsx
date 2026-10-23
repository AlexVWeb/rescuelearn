import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import {
  getAccessStatus,
  type AccessStatus,
} from "@/app/admin/training/lib/access-status";
import type { Inscription } from "@/app/admin/training/types";

function label(status: AccessStatus, inscription: Inscription) {
  switch (status) {
    case "opened":
      return `Espace ouvert · ${dayjs(inscription.accessLastUsedAt).format("DD/MM")}`;
    case "sent":
      return `Envoyé · ${dayjs(inscription.accessSentAt).format("DD/MM")}`;
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
