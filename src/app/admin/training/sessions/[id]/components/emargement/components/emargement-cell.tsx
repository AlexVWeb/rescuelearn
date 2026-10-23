import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmargementStatus } from "../../../../../types";

interface EmargementCellProps {
  traineeName: string;
  status: EmargementStatus;
  loading: boolean;
  isClosed?: boolean;
  onStatusChange: (status: EmargementStatus) => void;
}

// 36px à la souris, 44px au doigt (tablette du formateur)
const cellButton =
  "h-9 w-9 transition-colors pointer-coarse:h-11 pointer-coarse:w-11";

export function EmargementCell({
  traineeName,
  status,
  loading,
  isClosed = false,
  onStatusChange,
}: EmargementCellProps) {
  const isDisabled = loading || isClosed;

  return (
    <div className="flex gap-1" role="group" aria-label={traineeName}>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          cellButton,
          status === "validé"
            ? "border-success bg-success text-success-foreground hover:bg-success/90 hover:text-success-foreground"
            : "hover:border-success hover:text-success"
        )}
        onClick={() => onStatusChange("validé")}
        disabled={isDisabled}
        aria-pressed={status === "validé"}
        aria-label="Présent"
        title="Présent"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          cellButton,
          status === "absent"
            ? "border-destructive bg-destructive hover:bg-destructive/90 text-white"
            : "hover:border-destructive hover:text-destructive"
        )}
        onClick={() => onStatusChange("absent")}
        disabled={isDisabled}
        aria-pressed={status === "absent"}
        aria-label="Absent"
        title="Absent"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          cellButton,
          status === "en_attente"
            ? "bg-secondary"
            : "text-muted-foreground hover:bg-secondary/50"
        )}
        onClick={() => onStatusChange("en_attente")}
        disabled={isDisabled}
        aria-pressed={status === "en_attente"}
        aria-label="En attente"
        title="Réinitialiser"
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}
