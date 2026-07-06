import { Badge } from "@/components/ui/badge";
import { Inscription } from "../../../../../types";

interface TraineeCellProps {
  inscription: Inscription;
}

export function TraineeCell({ inscription }: TraineeCellProps) {
  return (
    <div className="flex flex-col">
      <span>
        {inscription.trainee?.firstName} {inscription.trainee?.lastName}
      </span>
      <Badge variant="outline" className="mt-1 w-fit text-[10px] uppercase">
        {inscription.status}
      </Badge>
    </div>
  );
}
