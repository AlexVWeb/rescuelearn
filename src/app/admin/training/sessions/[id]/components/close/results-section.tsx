"use client";
import { logger } from "@/lib/logger";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  updateAttestationResult,
  updateAttestationResults,
  updateInscriptionStatus,
} from "../../../../actions";
import {
  ATTESTATION_RESULT,
  INSCRIPTION_STATUS,
  type Inscription,
  type Slot,
} from "../../../../types";
import {
  countValidatedEmargements,
  suggestOutcome,
} from "../../../../lib/session-progress";
import { OUTCOME_LABELS } from "../inscription-status-badge";

type AttestationResult =
  (typeof ATTESTATION_RESULT)[keyof typeof ATTESTATION_RESULT];

interface ResultsSectionProps {
  sessionId: string;
  sessionStatus: string;
  slots: Slot[];
  inscriptions: Inscription[];
}

export function ResultsSection({
  sessionId,
  sessionStatus,
  slots,
  inscriptions,
}: ResultsSectionProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Valeurs affichées immédiatement, sans attendre l'aller-retour serveur
  const [pendingResults, setPendingResults] = useState<
    Record<string, AttestationResult>
  >({});
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>(
    {}
  );

  const isClosed = sessionStatus === "terminée" || sessionStatus === "annulée";

  const rows = inscriptions.map((i) => ({
    ...i,
    status: pendingStatus[i.id] ?? i.status,
    attestationResult: pendingResults[i.id] ?? i.attestationResult,
    suggestion: suggestOutcome(i, slots),
    validated: countValidatedEmargements(i, slots),
  }));

  // Suggestions applicables : émargement complet, issue encore non définie
  const suggestedIds = rows
    .filter(
      (r) =>
        r.suggestion === "suivie" && r.status === INSCRIPTION_STATUS.INSCRIT
    )
    .map((r) => r.id);

  const selectedCount = inscriptions.filter((i) =>
    selectedIds.has(i.id)
  ).length;
  const allSelected =
    inscriptions.length > 0 && selectedCount === inscriptions.length;

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(inscriptions.map((i) => i.id)) : new Set()
    );
  }

  async function applyStatus(ids: string[], status: string) {
    if (isClosed || ids.length === 0) return;
    setPendingStatus((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, status])),
    }));
    try {
      await Promise.all(ids.map((id) => updateInscriptionStatus(id, status)));
      startRefresh(() => router.refresh());
    } catch (e) {
      logger.error(e);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la mise à jour"
      );
      setPendingStatus((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    }
  }

  async function applyResults(ids: string[], value: AttestationResult) {
    if (isClosed || ids.length === 0) return;
    setPendingResults((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, value])),
    }));
    try {
      if (ids.length === 1) {
        await updateAttestationResult(ids[0], value);
      } else {
        await updateAttestationResults(sessionId, ids, value);
      }
      startRefresh(() => router.refresh());
    } catch (e) {
      logger.error(e);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la mise à jour"
      );
      // Retour à la valeur serveur pour les stagiaires concernés uniquement
      setPendingResults((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
    }
  }

  function handleBulkUpdateResult(value: AttestationResult) {
    const ids = inscriptions
      .filter((i) => selectedIds.has(i.id))
      .map((i) => i.id);
    setSelectedIds(new Set());
    applyResults(ids, value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats</CardTitle>
        <CardDescription>
          Confirmez l&apos;issue de la formation et le résultat de
          l&apos;attestation pour chaque stagiaire. « Formation suivie » valide
          la compétence du stagiaire.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!isClosed && suggestedIds.length > 0 && (
          <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              {suggestedIds.length} stagiaire
              {suggestedIds.length > 1 ? "s ont" : " a"} émargé tous les
              créneaux.
            </p>
            <Button
              size="sm"
              onClick={() =>
                applyStatus(suggestedIds, INSCRIPTION_STATUS.PRESENT)
              }
            >
              Marquer « Formation suivie »
            </Button>
          </div>
        )}

        {inscriptions.length === 0 ? (
          <p className="text-muted-foreground bg-muted/20 rounded-lg border border-dashed py-6 text-center text-sm">
            Aucun stagiaire inscrit à cette session.
          </p>
        ) : (
          <>
            <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 text-sm font-medium">
                <Checkbox
                  checked={
                    allSelected
                      ? true
                      : selectedCount > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  disabled={isClosed}
                  aria-label="Sélectionner tous les stagiaires"
                />
                {selectedCount > 0
                  ? `${selectedCount} stagiaire${selectedCount > 1 ? "s" : ""} sélectionné${selectedCount > 1 ? "s" : ""}`
                  : "Tout sélectionner"}
              </label>
              <div className="flex gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleBulkUpdateResult(ATTESTATION_RESULT.ACQUIS)
                  }
                  disabled={selectedCount === 0 || isClosed}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Acquis
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleBulkUpdateResult(ATTESTATION_RESULT.NON_ACQUIS)
                  }
                  disabled={selectedCount === 0 || isClosed}
                >
                  <X className="mr-2 h-4 w-4" />
                  Non acquis
                </Button>
              </div>
            </div>

            <ul className="space-y-2">
              {rows.map((row) => {
                const name =
                  `${row.trainee?.firstName ?? ""} ${row.trainee?.lastName ?? ""}`.trim();
                return (
                  <li
                    key={row.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                  >
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) =>
                          toggleSelected(row.id, checked === true)
                        }
                        disabled={isClosed}
                        aria-label={`Sélectionner ${name}`}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                          Émargement {row.validated}/{slots.length}
                          {row.suggestion === "a_verifier" &&
                            row.status === INSCRIPTION_STATUS.INSCRIT && (
                              <Badge variant="warning">
                                <TriangleAlert aria-hidden />
                                Absence à vérifier
                              </Badge>
                            )}
                          {/* Signal seulement : le formateur reste juge de l'issue */}
                          {row.status === INSCRIPTION_STATUS.PRESENT &&
                            slots.length > 0 &&
                            row.validated < slots.length && (
                              <Badge variant="warning">
                                <TriangleAlert aria-hidden />
                                Émargement incomplet
                              </Badge>
                            )}
                        </span>
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
                      <Select
                        value={row.status}
                        onValueChange={(val) => applyStatus([row.id], val)}
                        disabled={isClosed}
                      >
                        <SelectTrigger
                          className="h-9 w-[170px]"
                          aria-label={`Issue de la formation pour ${name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OUTCOME_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      <Select
                        value={row.attestationResult ?? ""}
                        onValueChange={(val) =>
                          applyResults([row.id], val as AttestationResult)
                        }
                        disabled={isClosed}
                      >
                        <SelectTrigger
                          className="h-9 w-[150px]"
                          aria-label={`Résultat de l'attestation pour ${name}`}
                        >
                          <SelectValue placeholder="Attestation…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ATTESTATION_RESULT.ACQUIS}>
                            Acquis
                          </SelectItem>
                          <SelectItem value={ATTESTATION_RESULT.NON_ACQUIS}>
                            Non acquis
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
