"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, Calendar } from "lucide-react";
import { createSlot, deleteSlot } from "../../../actions";
import { useRouter } from "next/navigation";

import { Slot } from "../../../types";

interface SlotsTabProps {
  sessionId: string;
  slots: Slot[];
}

export function SlotsTab({ sessionId, slots }: SlotsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newSlot, setNewSlot] = useState({
    label: "Jour 1",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "12:30",
  });

  async function handleAddSlot() {
    if (
      !newSlot.label ||
      !newSlot.date ||
      !newSlot.startTime ||
      !newSlot.endTime
    )
      return;

    setLoading(true);
    try {
      await createSlot(sessionId, {
        label: newSlot.label,
        date: new Date(newSlot.date),
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
      });
      setNewSlot({
        label: "Jour 1 - Après-midi",
        date: newSlot.date,
        startTime: "13:30",
        endTime: "17:00",
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous supprimer ce créneau ?")) return;
    setLoading(true);
    try {
      await deleteSlot(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organisation des demi-journées</CardTitle>
          <CardDescription>
            Définissez les créneaux horaires (slots) de cette session pour
            l'émargement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col items-end gap-2 sm:flex-row">
            <div className="grid w-full gap-2 sm:w-1/4">
              <span className="text-sm font-medium">Libellé</span>
              <Input
                value={newSlot.label}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, label: e.target.value })
                }
                placeholder="Ex: Jour 1 - Matin"
              />
            </div>
            <div className="grid w-full gap-2 sm:w-1/4">
              <span className="text-sm font-medium">Date</span>
              <Input
                type="date"
                value={newSlot.date}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, date: e.target.value })
                }
              />
            </div>
            <div className="grid w-full gap-2 sm:w-1/4">
              <span className="text-sm font-medium">Début</span>
              <Input
                type="time"
                value={newSlot.startTime}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, startTime: e.target.value })
                }
              />
            </div>
            <div className="grid w-full gap-2 sm:w-1/4">
              <span className="text-sm font-medium">Fin</span>
              <Input
                type="time"
                value={newSlot.endTime}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, endTime: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleAddSlot}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {slots.length === 0 ? (
              <p className="text-muted-foreground bg-muted/20 rounded-lg border py-4 text-center text-sm">
                Aucun créneau configuré.
              </p>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">{slot.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(slot.date).toLocaleDateString("fr-FR")} de{" "}
                        {slot.startTime} à {slot.endTime}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(slot.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
