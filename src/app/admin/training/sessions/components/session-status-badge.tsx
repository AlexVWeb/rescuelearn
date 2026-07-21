import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS, SessionStatus } from "../../types";

interface SessionStatusBadgeProps {
  status: SessionStatus | string;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  switch (status) {
    case SESSION_STATUS.PLANIFIEE:
      return <Badge variant="secondary">Planifiée</Badge>;
    case SESSION_STATUS.EN_COURS:
      return (
        <Badge className="border-transparent bg-blue-600 text-white hover:bg-blue-600">
          En cours
        </Badge>
      );
    case SESSION_STATUS.TERMINEE:
      return (
        <Badge className="border-transparent bg-green-600 text-white hover:bg-green-600">
          Terminée
        </Badge>
      );
    case SESSION_STATUS.ANNULEE:
      return <Badge variant="destructive">Annulée</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
