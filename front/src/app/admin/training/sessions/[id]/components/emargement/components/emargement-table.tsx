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
  onStatusChange,
  onBulkStatusChange,
  onGeneratePin,
}: EmargementTableProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-md border bg-white">
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-full table-auto border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="bg-muted/50 sticky left-0 z-20 w-[200px] min-w-[200px] border-r px-4 py-3 shadow-[2px_0_0_0_rgba(0,0,0,0.1)]">
                Stagiaire
              </TableHead>
              {slots.map((slot) => (
                <TableHead
                  key={slot.id}
                  className="min-w-[180px] border-r px-2 py-3 text-center"
                >
                  <SlotHeader
                    slot={slot}
                    pin={getSlotPin(inscriptions, slot.id)}
                    loading={loading}
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
                <TableCell className="sticky left-0 z-10 w-[200px] border-r bg-white px-4 py-3 font-medium shadow-[2px_0_0_0_rgba(0,0,0,0.1)]">
                  <TraineeCell inscription={inscription} />
                </TableCell>
                {slots.map((slot) => (
                  <TableCell
                    key={slot.id}
                    className="border-r px-2 py-3 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <EmargementCell
                        status={getEmargementStatus(inscription, slot.id)}
                        loading={loading}
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
      <div className="bg-muted/20 pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
