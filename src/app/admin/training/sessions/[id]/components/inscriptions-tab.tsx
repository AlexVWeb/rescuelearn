"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { Trash2, Upload, UserPlus, UserRoundPlus } from "lucide-react";
import {
  addTraineeToSession,
  removeTraineeFromSession,
} from "../../../actions";
import { useRouter } from "next/navigation";

import { Inscription, Trainee } from "../../../types";
import { TraineeDialog } from "../../../stagiaires/components/trainee-dialog";
import { TraineeImportDialog } from "../../../stagiaires/components/trainee-import-dialog";
import { InscriptionStatusBadge } from "./inscription-status-badge";
import { AccessMenu } from "./access/access-menu";
import { AccessStatusBadge } from "./access/access-status-badge";
import { SendAccessButton } from "./access/send-access-button";
import { ReadinessBadge } from "./welcome/readiness-badge";
import type { SessionReadiness } from "../../../actions";

interface InscriptionsTabProps {
  sessionId: string;
  sessionStatus: string;
  inscriptions: Inscription[];
  allTrainees: Trainee[];
  maxTrainees: number;
  /** null : la session n'a ni kit ni CGV, pas de suivi de préparation */
  readiness?: Record<string, SessionReadiness> | null;
}

export function InscriptionsTab({
  sessionId,
  sessionStatus,
  inscriptions,
  allTrainees,
  maxTrainees,
  readiness,
}: InscriptionsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState("");
  const [showTraineeDialog, setShowTraineeDialog] = useState(false);

  const isClosed = sessionStatus === "terminée" || sessionStatus === "annulée";
  const isFull = inscriptions.length >= maxTrainees;
  const inscribedIds = inscriptions.map((i) => i.traineeId);
  const availableTrainees = allTrainees.filter(
    (t) => !inscribedIds.includes(t.id)
  );

  async function handleAddTrainee() {
    if (!selectedTrainee || isClosed) return;
    setLoading(true);
    try {
      await addTraineeToSession(sessionId, selectedTrainee);
      setSelectedTrainee("");
      toast.success("Stagiaire inscrit avec succès");
      router.refresh();
    } catch (e) {
      logger.error(e);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'inscription"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTraineeCreated(traineeId: string) {
    setLoading(true);
    try {
      if (!isClosed) {
        await addTraineeToSession(sessionId, traineeId);
      }
      router.refresh();
    } catch (e) {
      logger.error(e);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'inscription"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: string) {
    if (isClosed) return;
    if (!confirm("Voulez-vous désinscrire ce stagiaire ?")) return;
    setLoading(true);
    try {
      await removeTraineeFromSession(id);
      toast.success("Stagiaire désinscrit");
      router.refresh();
    } catch (e) {
      logger.error(e);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la désinscription"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stagiaires inscrits</CardTitle>
          <CardDescription>
            {inscriptions.length} sur {maxTrainees} places. Chaque stagiaire
            reçoit un lien vers son espace (émargement, supports, attestation).
            L&apos;issue de la formation se saisit dans Clôturer › Résultats.
          </CardDescription>
          <CardAction>
            <SendAccessButton
              sessionId={sessionId}
              inscriptions={inscriptions}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          {!isClosed && (
            <div className="mb-6 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap">
              <Select
                value={selectedTrainee}
                onValueChange={setSelectedTrainee}
                disabled={isFull || loading}
              >
                <SelectTrigger
                  className="w-full sm:w-[300px]"
                  aria-label="Stagiaire à inscrire"
                >
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
                disabled={!selectedTrainee || isFull || loading}
                className="w-full sm:w-auto"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Inscrire
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTraineeDialog(true)}
                disabled={isFull || loading}
                className="w-full sm:w-auto"
              >
                <UserRoundPlus className="mr-2 h-4 w-4" /> Nouveau
              </Button>
              <TraineeImportDialog sessionId={sessionId}>
                <Button
                  variant="outline"
                  disabled={isFull || loading}
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" /> Importer
                </Button>
              </TraineeImportDialog>
              {isFull && (
                <span role="status" className="text-destructive ml-2 text-sm">
                  Session complète
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            {inscriptions.length === 0 ? (
              <p className="text-muted-foreground bg-muted/20 rounded-lg border border-dashed py-6 text-center text-sm">
                Aucun stagiaire inscrit pour le moment. Sélectionnez un
                stagiaire existant, créez-en un ou importez une liste.
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

                  <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                    {readiness?.[inscription.id] && (
                      <ReadinessBadge
                        readiness={readiness[inscription.id]}
                        traineeName={`${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim()}
                      />
                    )}
                    <AccessStatusBadge inscription={inscription} />
                    <InscriptionStatusBadge status={inscription.status} />
                    <AccessMenu inscription={inscription} />
                    {!isClosed && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => handleRemove(inscription.id)}
                        disabled={loading}
                        aria-label={`Désinscrire ${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <TraineeDialog
        open={showTraineeDialog}
        onOpenChange={setShowTraineeDialog}
        onSuccess={handleTraineeCreated}
      />
    </div>
  );
}
