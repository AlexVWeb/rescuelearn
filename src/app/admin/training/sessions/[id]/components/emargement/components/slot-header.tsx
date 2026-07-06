import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Check, X, RefreshCw } from "lucide-react";
import { Slot, EmargementStatus } from "../../../../../types";
import { PinDialog } from "./pin-dialog";

interface SlotHeaderProps {
  slot: Slot;
  pin: string | null;
  loading: boolean;
  onGeneratePin: (slotId: string) => void;
  onBulkStatusChange: (slotId: string, status: EmargementStatus) => void;
}

export function SlotHeader({
  slot,
  pin,
  loading,
  onGeneratePin,
  onBulkStatusChange,
}: SlotHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-bold">{slot.label}</span>
      <span className="text-muted-foreground text-xs font-normal">
        {dayjs(slot.date).format("DD/MM")} • {slot.startTime}-{slot.endTime}
      </span>

      <div className="mt-2 flex items-center justify-center gap-2">
        {pin ? (
          <PinDialog pin={pin} slot={slot} />
        ) : (
          <span className="text-muted-foreground text-[10px]">Pas de PIN</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onGeneratePin(slot.id)}
          disabled={loading}
          title="Générer/Rafraîchir PIN"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <div className="mt-2 flex justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700"
          onClick={() => onBulkStatusChange(slot.id, "validé")}
          disabled={loading}
          title="Tous présents"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/5 h-7 w-7"
          onClick={() => onBulkStatusChange(slot.id, "absent")}
          disabled={loading}
          title="Tous absents"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
