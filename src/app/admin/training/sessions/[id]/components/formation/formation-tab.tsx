"use client";
import { logger } from "@/lib/logger";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  FileDown,
  ClipboardList,
  Files,
  FileText,
  CheckCheck,
  X,
} from "lucide-react";
import {
  updateAttestationResult,
  updateAttestationResults,
} from "../../../../actions";
import {
  generateAttestationPDF,
  generateAllAttestationsPDF,
} from "../../../../lib/pdf-attestation-fin-formation-psc-export";
import { downloadFisePDF, downloadAllFisePDF } from "../../../../lib/pdf-fise";
import { downloadPvPDF } from "../../../../lib/pdf-pv";
import {
  Inscription,
  Slot,
  ATTESTATION_RESULT,
  INSCRIPTION_STATUS,
} from "../../../../types";

interface FormationTabProps {
  sessionId: string;
  session: {
    title: string;
    type?: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
    status?: string;
  };
  inscriptions: Inscription[];
  formateur: {
    lastName: string | null;
    firstName: string | null;
  };
  equipePedagogique?: string[];
  organismeLogoBase64?: string | null;
}

type AttestationResult =
  (typeof ATTESTATION_RESULT)[keyof typeof ATTESTATION_RESULT];

export function FormationTab({
  sessionId,
  session,
  inscriptions,
  formateur,
  equipePedagogique,
  organismeLogoBase64,
}: FormationTabProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Résultats affichés immédiatement, sans attendre l'aller-retour serveur
  const [pendingResults, setPendingResults] = useState<
    Record<string, AttestationResult>
  >({});
  // PDF en cours de génération : "all-fise", "pv" ou l'id d'une inscription
  const [generating, setGenerating] = useState<string | null>(null);

  const isClosed =
    session.status === "terminée" || session.status === "annulée";

  const displayedInscriptions = inscriptions.map((i) =>
    i.id in pendingResults
      ? { ...i, attestationResult: pendingResults[i.id] }
      : i
  );

  const inscriptionsWithResult = displayedInscriptions.filter(
    (i) => !!i.attestationResult
  );
  const hasAnyResult = inscriptionsWithResult.length > 0;

  // Ignore les inscriptions retirées de la session depuis la sélection
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

  async function generate(key: string, fn: () => Promise<void>) {
    setGenerating(key);
    try {
      await fn();
    } catch (e) {
      logger.error(e);
    } finally {
      setGenerating(null);
    }
  }

  function handleDownloadOne(inscription: Inscription) {
    generateAttestationPDF(session, inscription, formateur);
  }

  function handleDownloadAll() {
    generateAllAttestationsPDF(session, inscriptionsWithResult, formateur);
  }

  function handleDownloadAllFise() {
    generate("all-fise", () =>
      downloadAllFisePDF({
        session,
        inscriptions,
        formateur,
        equipePedagogique,
        organismeLogoBase64,
      })
    );
  }

  function handleDownloadFise(inscription: Inscription) {
    generate(inscription.id, () =>
      downloadFisePDF({
        session,
        inscription,
        formateur,
        equipePedagogique,
        organismeLogoBase64,
      })
    );
  }

  function handleDownloadPv() {
    const times = session.slots.map((s) => new Date(s.date).getTime());
    generate("pv", () =>
      downloadPvPDF({
        session: {
          ...session,
          endDate: times.length > 0 ? new Date(Math.max(...times)) : null,
        },
        inscriptions: displayedInscriptions,
        formateur,
      })
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case INSCRIPTION_STATUS.PRESENT:
        return (
          <Badge variant="default" className="bg-green-600">
            Présent
          </Badge>
        );
      case INSCRIPTION_STATUS.ABSENT:
        return <Badge variant="destructive">Absent</Badge>;
      case INSCRIPTION_STATUS.ELIMINE:
        return <Badge variant="destructive">Éliminé</Badge>;
      default:
        return <Badge variant="secondary">Inscrit</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Attestations de formation</CardTitle>
          <CardDescription>
            Validez les résultats et générez les attestations PDF
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={!hasAnyResult}
          >
            <Download className="mr-2 h-4 w-4" />
            Attestations de fin de formation
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadAllFise}
            disabled={inscriptions.length === 0 || generating !== null}
          >
            <Files className="mr-2 h-4 w-4" />
            {generating === "all-fise" ? "Génération..." : "Toutes les FISE"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPv}
            disabled={inscriptions.length === 0 || generating !== null}
          >
            <FileText className="mr-2 h-4 w-4" />
            {generating === "pv" ? "Génération..." : "PV de formation"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {inscriptions.length === 0 ? (
            <p className="text-muted-foreground bg-muted/20 rounded-lg border py-4 text-center text-sm">
              Aucun stagiaire inscrit
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
              {displayedInscriptions.map((inscription) => (
                <div
                  key={inscription.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(inscription.id)}
                      onCheckedChange={(checked) =>
                        toggleSelected(inscription.id, checked === true)
                      }
                      disabled={isClosed}
                      aria-label={`Sélectionner ${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`}
                    />
                    <div className="flex flex-col">
                      <p className="font-medium">
                        {inscription.trainee?.firstName}{" "}
                        {inscription.trainee?.lastName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {inscription.trainee?.email || "Pas d'email"}
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {getStatusBadge(inscription.status)}

                    <Select
                      value={inscription.attestationResult ?? ""}
                      onValueChange={(val) =>
                        applyResults([inscription.id], val as AttestationResult)
                      }
                      disabled={isClosed}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Non défini" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ATTESTATION_RESULT.ACQUIS}>
                          Acquis
                        </SelectItem>
                        <SelectItem value={ATTESTATION_RESULT.NON_ACQUIS}>
                          Non Acquis
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownloadOne(inscription)}
                      disabled={!inscription.attestationResult}
                      title="Télécharger l'attestation de fin de formation"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownloadFise(inscription)}
                      disabled={generating !== null}
                      title="Télécharger la FISE"
                    >
                      <ClipboardList
                        className={`h-4 w-4 ${generating === inscription.id ? "animate-pulse" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
