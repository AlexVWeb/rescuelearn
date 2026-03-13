import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { InscriptionWithSession, ExternalTraining } from "../../../types";
import { ExternalTrainingDialog } from "./external-training-dialog";
import { DeleteExternalTrainingButton } from "./delete-external-training-button";
import { getPresignedUrl } from "@/lib/r2";

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
  const trainingsWithUrls = await Promise.all(
    externalTrainings.map(async (ext) => ({
      ...ext,
      signedUrl: ext.fileKey ? await getPresignedUrl(ext.fileKey) : null,
    }))
  );

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
                    Date session
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Statut</th>
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
                      ? dayjs(sessionDate).add(1, "year")
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
                        {sessionDate
                          ? dayjs(sessionDate).format("DD/MM/YYYY")
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
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
          <ExternalTrainingDialog traineeId={traineeId} />
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
                  <th className="px-4 py-2 text-left font-medium">Formation</th>
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
                  const expiryDate = dayjs(ext.obtainedAt).add(1, "year");
                  const expired = expiryDate.isBefore(dayjs());

                  return (
                    <tr key={ext.id} className="border-t">
                      <td className="px-4 py-2">
                        <Badge variant="outline">{ext.type}</Badge>
                      </td>
                      <td className="px-4 py-2 font-medium">{ext.name}</td>
                      <td className="text-muted-foreground px-4 py-2">
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
                        {ext.signedUrl ? (
                          <a
                            href={ext.signedUrl}
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
                        <DeleteExternalTrainingButton id={ext.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
