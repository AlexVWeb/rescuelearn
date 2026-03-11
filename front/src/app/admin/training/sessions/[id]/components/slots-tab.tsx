"use client";

import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { createSlot, deleteSlot } from "../../../actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import "dayjs/locale/fr";

dayjs.locale("fr");

import { Slot } from "../../../types";
import {
  getNextSlotSuggestion,
  isDateWithinSession,
  SlotSuggestion,
} from "./slot-utils";

interface SlotsTabProps {
  sessionId: string;
  slots: Slot[];
  sessionStartDate: Date | null;
  sessionEndDate: Date | null;
}

export function SlotsTab({
  sessionId,
  slots,
  sessionStartDate,
  sessionEndDate,
}: SlotsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SlotSuggestion | null>(null);

  const [newSlot, setNewSlot] = useState({
    label: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // Mettre à jour la suggestion quand les slots changent
  useEffect(() => {
    const nextSuggestion = getNextSlotSuggestion(
      slots,
      sessionStartDate,
      sessionEndDate
    );
    setSuggestion(nextSuggestion);
    // On n'écrase pas les champs si l'utilisateur a commencé à saisir,
    // sauf si c'est le premier chargement ou après un ajout réussi
    if (!newSlot.label && nextSuggestion) {
      setNewSlot(nextSuggestion);
    }
  }, [slots, sessionStartDate, sessionEndDate]);

  const isDateValid =
    !newSlot.date ||
    isDateWithinSession(newSlot.date, sessionStartDate, sessionEndDate);

  async function handleAddSlot() {
    if (
      !newSlot.label ||
      !newSlot.date ||
      !newSlot.startTime ||
      !newSlot.endTime
    ) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!isDateValid) {
      toast.warning(
        "Attention: Ce créneau est en dehors des dates prévues de la session. Pensez à mettre à jour les dates dans les paramètres si nécessaire."
      );
    }

    setLoading(true);
    try {
      await createSlot(sessionId, {
        label: newSlot.label,
        date: dayjs(newSlot.date).hour(12).toDate(),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
      });

      toast.success("Créneau ajouté");

      // Réinitialiser avec la nouvelle suggestion qui sera calculée par le useEffect
      setNewSlot({
        label: "",
        date: "",
        startTime: "",
        endTime: "",
      });

      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'ajout du créneau");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion() {
    if (suggestion) {
      setNewSlot({
        label: suggestion.label,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
      });
      toast.info("Suggestion appliquée");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous supprimer ce créneau ?")) return;
    setLoading(true);
    try {
      await deleteSlot(id);
      toast.success("Créneau supprimé");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 overflow-hidden border-2">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                Organisation des créneaux
              </CardTitle>
              <CardDescription>
                Définissez les demi-journées de formation pour l'émargement.
              </CardDescription>
            </div>
            {sessionStartDate && sessionEndDate && (
              <Badge variant="outline" className="bg-background">
                {dayjs(sessionStartDate).startOf("day").format("DD/MM/YYYY")} au{" "}
                {dayjs(sessionEndDate).startOf("day").format("DD/MM/YYYY")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            {!isDateValid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Attention</AlertTitle>
                <AlertDescription>
                  La date sélectionnée est en dehors des dates de la session.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-12">
              <div className="grid gap-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Libellé
                </label>
                <Input
                  value={newSlot.label}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, label: e.target.value })
                  }
                  placeholder="Ex: Jour 1 - Matin"
                  className="bg-muted/30 focus-visible:ring-primary"
                />
              </div>
              <div className="grid gap-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </label>
                <Input
                  type="date"
                  value={newSlot.date}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, date: e.target.value })
                  }
                  className={cn(
                    "bg-muted/30 focus-visible:ring-primary",
                    !isDateValid && "border-destructive text-destructive"
                  )}
                />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-3.5 w-3.5" /> Début
                </label>
                <Input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, startTime: e.target.value })
                  }
                  className="bg-muted/30 focus-visible:ring-primary"
                />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-3.5 w-3.5" /> Fin
                </label>
                <Input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, endTime: e.target.value })
                  }
                  className="bg-muted/30 focus-visible:ring-primary"
                />
              </div>
              <Button
                onClick={handleAddSlot}
                disabled={loading || !isDateValid}
                className="w-full transition-all hover:scale-[1.02] lg:col-span-2"
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>

            {suggestion &&
              (newSlot.label !== suggestion.label ||
                newSlot.date !== suggestion.date) && (
                <div
                  className="bg-secondary/20 hover:bg-secondary/30 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 transition-colors"
                  onClick={applySuggestion}
                >
                  <Sparkles className="text-primary h-4 w-4 animate-pulse" />
                  <div className="text-sm">
                    <span className="font-medium">Suggestion :</span>{" "}
                    {suggestion.label} le{" "}
                    {dayjs(suggestion.date).format("DD/MM/YYYY")} (
                    {suggestion.startTime}-{suggestion.endTime})
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs"
                  >
                    Appliquer
                  </Button>
                </div>
              )}
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
              Créneaux planifiés{" "}
              <Badge variant="secondary" className="rounded-full px-2">
                {slots.length}
              </Badge>
            </h3>
            <div className="grid gap-3">
              {slots.length === 0 ? (
                <div className="bg-muted/10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12">
                  <Calendar className="text-muted-foreground/30 mb-3 h-10 w-10" />
                  <p className="text-muted-foreground text-sm">
                    Aucun créneau configuré pour le moment.
                  </p>
                </div>
              ) : (
                [...slots]
                  .sort(
                    (a, b) =>
                      dayjs(a.date).startOf("day").valueOf() -
                        dayjs(b.date).startOf("day").valueOf() ||
                      a.startTime.localeCompare(b.startTime)
                  )
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className="group bg-card hover:border-primary/20 flex items-center justify-between rounded-xl border p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-bold">
                          {slot.label.match(/\d+/)?.[0] || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-bold lg:text-base">
                            {slot.label}
                          </p>
                          <div className="mt-1 flex items-center gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs capitalize lg:text-sm">
                              <Calendar className="h-3.5 w-3.5" />
                              {dayjs(slot.date)
                                .startOf("day")
                                .format("dddd DD/MM/YYYY")}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1.5 text-xs lg:text-sm">
                              <Clock className="h-3.5 w-3.5" />
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleDelete(slot.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
