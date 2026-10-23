import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Slot,
  Inscription,
  Emargement,
  EmargementStatus,
} from "../../../../../types";
import { SlotHeader } from "./slot-header";
import { EmargementCell } from "./emargement-cell";
import { TraineeCell } from "./trainee-cell";
import { findCurrentSlotId } from "../../../../../lib/session-progress";

function getEmargementStatus(
  inscription: Inscription,
  slotId: string
): EmargementStatus {
  const found = inscription.emargements?.find(
    (e: Emargement) => e.slotId === slotId
  );
  return found?.status ?? "en_attente";
}

function getSlotPin(
  inscriptions: Inscription[],
  slotId: string
): string | null {
  const found = inscriptions[0]?.emargements?.find(
    (e: Emargement) => e.slotId === slotId && e.validationCode
  );
  return found?.validationCode ?? null;
}

interface EmargementTableProps {
  slots: Slot[];
  inscriptions: Inscription[];
  loading: boolean;
  isClosed?: boolean;
  onStatusChange: (
    inscriptionId: string,
    slotId: string,
    status: EmargementStatus
  ) => void;
  onBulkStatusChange: (slotId: string, status: EmargementStatus) => void;
  onGeneratePin: (slotId: string) => void;
}

export function EmargementTable({
  slots,
  inscriptions,
  loading,
  isClosed = false,
  onStatusChange,
  onBulkStatusChange,
  onGeneratePin,
}: EmargementTableProps) {
  const [currentSlotId] = useState(() => findCurrentSlotId(slots, new Date()));
  const currentHeadRef = useRef<HTMLTableCellElement>(null);

  // Amène la colonne du créneau en cours dans la vue (tablette, peu de largeur)
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    currentHeadRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="bg-background relative w-full overflow-hidden rounded-md border">
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-full table-auto border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="bg-muted sticky left-0 z-[2] w-[200px] min-w-[200px] border-r px-4 py-3 shadow-[4px_0_8px_rgba(0,0,0,0.15)]">
                Stagiaire
              </TableHead>
              {slots.map((slot) => (
                <TableHead
                  key={slot.id}
                  ref={slot.id === currentSlotId ? currentHeadRef : undefined}
                  aria-current={slot.id === currentSlotId ? "time" : undefined}
                  className={cn(
                    "min-w-[180px] border-r px-2 py-3 text-center",
                    slot.id === currentSlotId &&
                      "bg-primary/5 shadow-[inset_0_3px_0_var(--primary)]"
                  )}
                >
                  {slot.id === currentSlotId && (
                    <span className="text-primary mb-1 block text-xs font-semibold">
                      En cours / à venir
                    </span>
                  )}
                  <SlotHeader
                    slot={slot}
                    pin={getSlotPin(inscriptions, slot.id)}
                    loading={loading}
                    isClosed={isClosed}
                    onGeneratePin={onGeneratePin}
                    onBulkStatusChange={onBulkStatusChange}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inscriptions.map((inscription) => (
              <TableRow key={inscription.id} className="hover:bg-muted/30">
                <TableCell className="bg-muted/70 sticky left-0 z-[1] w-[200px] border-r px-4 py-3 font-medium shadow-[4px_0_8px_rgba(0,0,0,0.15)]">
                  <TraineeCell inscription={inscription} />
                </TableCell>
                {slots.map((slot) => (
                  <TableCell
                    key={slot.id}
                    className={cn(
                      "border-r px-2 py-3 text-center",
                      slot.id === currentSlotId && "bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <EmargementCell
                        traineeName={`${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}, ${slot.label}`}
                        status={getEmargementStatus(inscription, slot.id)}
                        loading={loading}
                        isClosed={isClosed}
                        onStatusChange={(status) =>
                          onStatusChange(inscription.id, slot.id, status)
                        }
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent" />
    </div>
  );
}
