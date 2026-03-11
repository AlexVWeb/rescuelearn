"use client";

import dayjs from "dayjs";
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
import {
  updateEmargementStatus,
  generateSlotPin,
  generateSessionPin,
  bulkUpdateEmargementStatus,
} from "../../../actions";
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
import {
  RefreshCw,
  Download,
  Check,
  X,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const getEmargement = (inscription: Inscription, slotId: string) => {
    return (
      inscription.emargements?.find((e: any) => e.slotId === slotId) || {
        status: "en_attente",
      }
    );
  };

  // To display the generated PIN code across all Emargements for a slot
  const getSlotPin = (slotId: string) => {
    const sampleEmargementWithPin = inscriptions[0]?.emargements?.find(
      (e: any) => e.slotId === slotId && e.validationCode
    );
    return sampleEmargementWithPin?.validationCode || null;
  };

  async function handleStatusChange(
    inscriptionId: string,
    slotId: string,
    status: string
  ) {
    setLoading(true);
    try {
      await updateEmargementStatus(inscriptionId, slotId, status);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkStatusChange(slotId: string, status: string) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    if (
      !confirm(
        `Voulez-vous marquer tous les stagiaires comme "${
          status === "validé" ? "Présent" : "Absent"
        }" pour le créneau "${slot.label}" ?`
      )
    )
      return;
    setLoading(true);
    try {
      await bulkUpdateEmargementStatus(slotId, status);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePin(slotId: string) {
    setLoading(true);
    try {
      await generateSlotPin(slotId);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSessionPin() {
    if (
      !confirm(
        "Voulez-vous générer un code PIN unique pour TOUS les créneaux de cette formation ?"
      )
    )
      return;
    setLoading(true);
    try {
      await generateSessionPin(sessionId);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h3 className="text-lg font-semibold">Tableau d'émargement</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateSessionPin}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />{" "}
            Générer PIN global
          </Button>
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
      </div>

      {/* Desktop View: Matrix Table */}
      <div className="relative w-full overflow-hidden rounded-md border bg-white">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full table-auto border-collapse">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="bg-muted/50 sticky left-0 z-20 w-[200px] min-w-[200px] border-r px-4 py-3 shadow-[2px_0_0_0_rgba(0,0,0,0.1)]">
                  Stagiaire
                </TableHead>
                {slots.map((slot) => {
                  const pin = getSlotPin(slot.id);
                  return (
                    <TableHead
                      key={slot.id}
                      className="min-w-[180px] border-r px-2 py-3 text-center"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{slot.label}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {dayjs(slot.date).format("DD/MM")} • {slot.startTime}-
                          {slot.endTime}
                        </span>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          {pin ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-xs tracking-wider"
                            >
                              PIN: {pin}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">
                              Pas de PIN
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleGeneratePin(slot.id)}
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
                            onClick={() =>
                              handleBulkStatusChange(slot.id, "validé")
                            }
                            disabled={loading}
                            title="Tous présents"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/5 h-7 w-7"
                            onClick={() =>
                              handleBulkStatusChange(slot.id, "absent")
                            }
                            disabled={loading}
                            title="Tous absents"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscriptions.map((inscription) => (
                <TableRow key={inscription.id} className="hover:bg-muted/30">
                  <TableCell className="sticky left-0 z-10 w-[200px] border-r bg-white px-4 py-3 font-medium shadow-[2px_0_0_0_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span>
                        {inscription.trainee?.firstName}{" "}
                        {inscription.trainee?.lastName}
                      </span>
                      <Badge
                        variant="outline"
                        className="mt-1 w-fit text-[10px] uppercase"
                      >
                        {inscription.status}
                      </Badge>
                    </div>
                  </TableCell>
                  {slots.map((slot) => {
                    const emargement = getEmargement(inscription, slot.id);
                    return (
                      <TableCell
                        key={slot.id}
                        className="border-r px-2 py-3 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-8 w-8 transition-all",
                                emargement.status === "validé"
                                  ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
                                  : "hover:border-green-600 hover:text-green-600"
                              )}
                              onClick={() =>
                                handleStatusChange(
                                  inscription.id,
                                  slot.id,
                                  "validé"
                                )
                              }
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
                                emargement.status === "absent"
                                  ? "border-destructive bg-destructive hover:bg-destructive/90 text-white"
                                  : "hover:border-destructive hover:text-destructive"
                              )}
                              onClick={() =>
                                handleStatusChange(
                                  inscription.id,
                                  slot.id,
                                  "absent"
                                )
                              }
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
                                emargement.status === "en_attente"
                                  ? "bg-secondary"
                                  : "text-muted-foreground hover:bg-secondary/50"
                              )}
                              onClick={() =>
                                handleStatusChange(
                                  inscription.id,
                                  slot.id,
                                  "en_attente"
                                )
                              }
                              disabled={loading}
                              title="Réinitialiser"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-muted/20 pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-green-600" />
            <span>Présent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-destructive h-3 w-3 rounded-full" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-secondary h-3 w-3 rounded-full" />
            <span>En attente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
