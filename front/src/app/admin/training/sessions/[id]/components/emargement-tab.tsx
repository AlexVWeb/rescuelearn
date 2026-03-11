"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateEmargementStatus, generateSlotPin } from "../../../actions";
import { generateEmargementPDF } from "../../../lib/pdf-export";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Download } from "lucide-react";

import { Slot, Inscription } from "../../../types";

interface EmargementTabProps {
  sessionId: string;
  sessionTitle: string;
  sessionLocation?: string | null;
  sessionType?: string;
  slots: Slot[];
  inscriptions: Inscription[];
}

export function EmargementTab({
  sessionId,
  sessionTitle,
  sessionLocation,
  sessionType,
  slots,
  inscriptions,
}: EmargementTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>(slots[0]?.id || "");

  const activeSlot = slots.find((s) => s.id === selectedSlot);

  async function handleStatusChange(inscriptionId: string, status: string) {
    if (!activeSlot) return;
    setLoading(true);
    try {
      await updateEmargementStatus(inscriptionId, activeSlot.id, status);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePin() {
    if (!activeSlot) return;
    setLoading(true);
    try {
      await generateSlotPin(activeSlot.id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Find the Emargement status for a specific inscription and slot
  const getEmargement = (inscription: Inscription) => {
    return (
      inscription.emargements?.find((e: any) => e.slotId === selectedSlot) || {
        status: "en_attente",
      }
    );
  };

  if (slots.length === 0) {
    return (
      <div className="p-4 text-center">
        Veuillez d'abord configurer des créneaux dans l'onglet Programme.
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div className="p-4 text-center">
        Aucun stagiaire inscrit à cette session.
      </div>
    );
  }

  // To display the generated PIN code across all Emargements for this slot, we can just grab the first valid one
  // or add the PIN to the slot model. The POC likely sets validationCode on each Emargement record uniformly.
  const sampleEmargementWithPin = inscriptions[0]?.emargements?.find(
    (e: any) => e.slotId === selectedSlot && e.validationCode
  );
  const currentPin =
    sampleEmargementWithPin?.validationCode || "Aucun code PIN actif";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Choisir un créneau" />
          </SelectTrigger>
          <SelectContent>
            {slots.map((slot) => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.label} ({new Date(slot.date).toLocaleDateString()}{" "}
                {slot.startTime}-{slot.endTime})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="bg-muted/50 flex w-full items-center gap-4 rounded-lg border px-4 py-2 sm:w-auto">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              PIN d'émargement
            </span>
            <span className="font-mono text-2xl tracking-widest">
              {currentPin}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleGeneratePin}
            disabled={loading}
            title="Générer un nouveau PIN"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-2 flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            generateEmargementPDF(
              {
                title: sessionTitle,
                location: sessionLocation,
                type: sessionType,
              },
              slots,
              inscriptions
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Exporter PDF
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stagiaire</TableHead>
              <TableHead>Statut global</TableHead>
              <TableHead>Émargement pour ce créneau</TableHead>
              <TableHead className="text-right">Action (Manuel)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inscriptions.map((inscription) => {
              const emargement = getEmargement(inscription);
              return (
                <TableRow key={inscription.id}>
                  <TableCell className="font-medium">
                    {inscription.trainee?.firstName}{" "}
                    {inscription.trainee?.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{inscription.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {emargement.status === "validé" ? (
                      <Badge className="bg-green-600">Présent (Validé)</Badge>
                    ) : emargement.status === "absent" ? (
                      <Badge variant="destructive">Absent</Badge>
                    ) : (
                      <Badge variant="secondary">En attente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select
                      value={emargement.status}
                      onValueChange={(val) =>
                        handleStatusChange(inscription.id, val)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="ml-auto h-8 w-[140px]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="validé">Présent</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
