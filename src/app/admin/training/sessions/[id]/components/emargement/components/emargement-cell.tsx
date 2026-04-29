import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmargementStatus } from "../../../../../types";

interface EmargementCellProps {
  status: EmargementStatus;
  loading: boolean;
  onStatusChange: (status: EmargementStatus) => void;
}

export function EmargementCell({
  status,
  loading,
  onStatusChange,
}: EmargementCellProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "h-8 w-8 transition-all",
          status === "validé"
            ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
            : "hover:border-green-600 hover:text-green-600"
        )}
        onClick={() => onStatusChange("validé")}
        disabled={loading}
        title="Présent"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "h-8 w-8 transition-all",
          status === "absent"
            ? "border-destructive bg-destructive hover:bg-destructive/90 text-white"
            : "hover:border-destructive hover:text-destructive"
        )}
        onClick={() => onStatusChange("absent")}
        disabled={loading}
        title="Absent"
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "h-8 w-8 transition-all",
          status === "en_attente"
            ? "bg-secondary"
            : "text-muted-foreground hover:bg-secondary/50"
        )}
        onClick={() => onStatusChange("en_attente")}
        disabled={loading}
        title="Réinitialiser"
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
}
