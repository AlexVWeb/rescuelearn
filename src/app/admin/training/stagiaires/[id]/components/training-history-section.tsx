import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InscriptionWithSession, ExternalTraining } from "../../../types";

import { ExternalTrainingDialog } from "./external-training-dialog";
import { DeleteExternalTrainingButton } from "./delete-external-training-button";
import {
  computeFilieres,
  detectExternalTrainingAnomalies,
} from "../../../lib/trainee-validity";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  présent: { label: "Présent", variant: "default" },
  présent_partiel: { label: "Présent partiel", variant: "secondary" },
  inscrit: { label: "Inscrit", variant: "outline" },
  absent: { label: "Absent", variant: "destructive" },
  éliminé: { label: "Éliminé", variant: "destructive" },
  annulé: { label: "Annulé", variant: "secondary" },
};

interface Props {
  inscriptions: InscriptionWithSession[];
  externalTrainings: ExternalTraining[];
  traineeId: string;
}

export async function TrainingHistorySection({
  inscriptions,
  externalTrainings,
  traineeId,
}: Props) {
  const trainingsWithUrls = externalTrainings.map((ext) => ({
    ...ext,
    downloadUrl: ext.fileKey ? `/api/admin/documents/${ext.fileKey}` : null,
  }));

  // === Validité par filière ===
  const filieres = computeFilieres(inscriptions, externalTrainings);

  return (
    <div className="space-y-8">
      {/* === Formations plateforme === */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Formations plateforme{" "}
            <span className="text-muted-foreground text-sm font-normal">
              ({inscriptions.length})
            </span>
          </h2>
        </div>

        {inscriptions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune inscription enregistrée.
          </p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Formation</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Date d&apos;obtention
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
                  <th className="px-4 py-2 text-left font-medium">Résultat</th>
                  <th className="px-4 py-2 text-left font-medium">Validité</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((ins) => {
                  const cfg = statusConfig[ins.status] ?? {
                    label: ins.status,
                    variant: "outline" as const,
                  };
                  const sessionDate = ins.trainingSession.startDate;
                  const isValid = ins.status === "présent";
                  const expiryDate =
                    isValid && sessionDate
                      ? dayjs(sessionDate).add(1, "year").endOf("year")
                      : null;
                  const expired = expiryDate
                    ? expiryDate.isBefore(dayjs())
                    : false;

                  return (
                    <tr key={ins.id} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {ins.trainingSession.title}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {ins.attestationResult === "acquis" &&
                        ins.attestationValidatedAt
                          ? dayjs(ins.attestationValidatedAt).format(
                              "DD/MM/YYYY"
                            )
                          : "—"}
                      </td>
                      <td className="flex items-center gap-1 px-4 py-2">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {ins.trainingSession.isFC && (
                          <Badge variant="outline" className="text-xs">
                            FC
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {ins.attestationResult === "acquis" ? (
                          <Badge variant="success">Acquis</Badge>
                        ) : ins.attestationResult === "non_acquis" ? (
                          <Badge variant="destructive">Non acquis</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {expiryDate ? (
                          <Badge variant={expired ? "destructive" : "default"}>
                            {expired ? "Expiré" : "Valide"} —{" "}
                            {expiryDate.format("DD/MM/YYYY")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/admin/training/sessions/${ins.trainingSessionId}`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === Formations externes === */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Formations externes{" "}
            <span className="text-muted-foreground text-sm font-normal">
              ({externalTrainings.length})
            </span>
          </h2>
          <ExternalTrainingDialog
            traineeId={traineeId}
            inscriptions={inscriptions}
            externalTrainings={externalTrainings}
          />
        </div>

        {trainingsWithUrls.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune formation externe enregistrée.
          </p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Organisme</th>
                  <th className="px-4 py-2 text-left font-medium">Obtention</th>
                  <th className="px-4 py-2 text-left font-medium">Validité</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Certificat
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Fichier</th>
                  <th className="px-4 py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {trainingsWithUrls.map((ext) => {
                  const expiryDate = dayjs(ext.obtainedAt)
                    .add(1, "year")
                    .endOf("year");
                  const expired = expiryDate.isBefore(dayjs());

                  const anomalies = detectExternalTrainingAnomalies(
                    ext,
                    inscriptions,
                    externalTrainings
                  );

                  return (
                    <tr key={ext.id} className="border-t">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{ext.type}</Badge>
                          {ext.isFC && (
                            <Badge variant="outline" className="text-xs">
                              FC
                            </Badge>
                          )}
                          {anomalies.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="destructive"
                                    className="flex cursor-help items-center gap-1 bg-amber-500 text-xs text-white hover:bg-amber-600"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    Anomalie
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs space-y-1 text-xs">
                                  {anomalies.map((a) => (
                                    <p key={a.code}>⚠️ {a.message}</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>

                      <td className="text-muted-foreground px-4 py-2 font-medium">
                        {ext.organisme}
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {dayjs(ext.obtainedAt).format("DD/MM/YYYY")}
                      </td>

                      <td className="px-4 py-2">
                        <Badge variant={expired ? "destructive" : "default"}>
                          {expired ? "Expiré" : "Valide"} —{" "}
                          {expiryDate.format("DD/MM/YYYY")}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-2">
                        {ext.certificateNumber || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {ext.downloadUrl ? (
                          <a
                            href={ext.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Voir
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ExternalTrainingDialog
                            traineeId={traineeId}
                            training={ext}
                            inscriptions={inscriptions}
                            externalTrainings={externalTrainings}
                          />
                          <DeleteExternalTrainingButton id={ext.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === Validité par filière === */}
      {filieres.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Validité par filière</h2>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Filière</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Diplôme initial
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    Dernière FC
                  </th>
                  <th className="px-4 py-2 text-left font-medium">
                    Validité effective
                  </th>
                </tr>
              </thead>
              <tbody>
                {filieres.map((f) => (
                  <tr key={f.type} className="border-t">
                    <td className="px-4 py-2 font-medium">{f.type}</td>
                    <td className="px-4 py-2">
                      {f.diplomaDate
                        ? dayjs(f.diplomaDate).format("DD/MM/YYYY")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {f.lastFCDate
                        ? dayjs(f.lastFCDate).format("DD/MM/YYYY")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={f.expired ? "destructive" : "default"}>
                        {f.expired ? "Expiré" : "Valide"} —{" "}
                        {f.effectiveExpiry.format("DD/MM/YYYY")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
