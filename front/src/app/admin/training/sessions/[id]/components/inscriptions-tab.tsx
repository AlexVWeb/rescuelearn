"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";
import {
  addTraineeToSession,
  removeTraineeFromSession,
  updateInscriptionStatus,
} from "../../../actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

import { Inscription, Trainee } from "../../../types";

interface InscriptionsTabProps {
  sessionId: string;
  inscriptions: Inscription[];
  allTrainees: Trainee[];
  maxTrainees: number;
}

export function InscriptionsTab({
  sessionId,
  inscriptions,
  allTrainees,
  maxTrainees,
}: InscriptionsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState("");

  const inscribedIds = inscriptions.map((i) => i.traineeId);
  const availableTrainees = allTrainees.filter(
    (t) => !inscribedIds.includes(t.id)
  );

  async function handleAddTrainee() {
    if (!selectedTrainee) return;
    setLoading(true);
    try {
      await addTraineeToSession(sessionId, selectedTrainee);
      setSelectedTrainee("");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Voulez-vous désinscrire ce stagiaire ?")) return;
    setLoading(true);
    try {
      await removeTraineeFromSession(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    setLoading(true);
    try {
      await updateInscriptionStatus(id, status);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "présent":
        return (
          <Badge variant="default" className="bg-green-600">
            Présent
          </Badge>
        );
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "éliminé":
        return <Badge variant="destructive">Éliminé</Badge>;
      default:
        return <Badge variant="secondary">Inscrit</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Liste des Inscrits</CardTitle>
          <CardDescription>
            Gérez les inscriptions des stagiaires à cette session. (
            {inscriptions.length} sur {maxTrainees} places)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col items-center gap-2 sm:flex-row">
            <Select
              value={selectedTrainee}
              onValueChange={setSelectedTrainee}
              disabled={inscriptions.length >= maxTrainees || loading}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Sélectionner un stagiaire" />
              </SelectTrigger>
              <SelectContent>
                {availableTrainees.map((trainee) => (
                  <SelectItem key={trainee.id} value={trainee.id}>
                    {trainee.firstName} {trainee.lastName}
                  </SelectItem>
                ))}
                {availableTrainees.length === 0 && (
                  <SelectItem value="none" disabled>
                    Aucun stagiaire disponible
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddTrainee}
              disabled={
                !selectedTrainee ||
                inscriptions.length >= maxTrainees ||
                loading
              }
              className="w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Inscrire
            </Button>
            {inscriptions.length >= maxTrainees && (
              <span className="text-destructive ml-2 text-sm">
                Session complète
              </span>
            )}
          </div>

          <div className="space-y-2">
            {inscriptions.length === 0 ? (
              <p className="text-muted-foreground bg-muted/20 rounded-lg border py-4 text-center text-sm">
                Aucun stagiaire inscrit pour le moment.
              </p>
            ) : (
              inscriptions.map((inscription) => (
                <div
                  key={inscription.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-col">
                    <p className="font-medium">
                      {inscription.trainee?.firstName}{" "}
                      {inscription.trainee?.lastName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {inscription.trainee?.email || "Pas d'email"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {getStatusBadge(inscription.status)}
                    <Select
                      value={inscription.status}
                      onValueChange={(val) =>
                        handleUpdateStatus(inscription.id, val)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscrit">Inscrit</SelectItem>
                        <SelectItem value="présent">Présent</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="éliminé">Éliminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => handleRemove(inscription.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
