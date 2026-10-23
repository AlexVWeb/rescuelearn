import { Inscription, INSCRIPTION_STATUS } from "../../../../../types";
import { InscriptionStatusBadge } from "../../inscription-status-badge";

interface TraineeCellProps {
  inscription: Inscription;
}

export function TraineeCell({ inscription }: TraineeCellProps) {
  return (
    <div className="flex flex-col">
      <span>
        {inscription.trainee?.firstName} {inscription.trainee?.lastName}
      </span>
      {/* Seul l'éliminé change la conduite à tenir pendant l'animation */}
      {inscription.status === INSCRIPTION_STATUS.ELIMINE && (
        <span className="mt-1">
          <InscriptionStatusBadge status={inscription.status} />
        </span>
      )}
    </div>
  );
}
