"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Download,
  FileDown,
  ClipboardList,
  Files,
  FileText,
} from "lucide-react";
import { updateAttestationResult } from "../../../../actions";
import {
  generateAttestationPDF,
  generateAllAttestationsPDF,
} from "../../../../lib/pdf-attestation-fin-formation-psc-export";
import {
  SingleFisePDFDownload,
  MultipleFisePDFDownload,
} from "../../../../lib/pdf-fise";
import { PvPDFDownload } from "../../../../lib/pdf-pv";
import { Inscription, Slot } from "../../../../types";

interface FormationTabProps {
  sessionId: string;
  session: {
    title: string;
    location: string;
    startDate: Date | null;
    slots: Slot[];
  };
  inscriptions: Inscription[];
  formateur: {
    lastName: string | null;
    firstName: string | null;
  };
  organismeLogoBase64?: string | null;
}

export function FormationTab({
  sessionId: _sessionId,
  session,
  inscriptions,
  formateur,
  organismeLogoBase64,
}: FormationTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const inscriptionsWithResult = inscriptions.filter(
    (i) => !!i.attestationResult
  );
  const hasAnyResult = inscriptionsWithResult.length > 0;

  async function handleUpdateResult(id: string, value: string) {
    setLoading(true);
    try {
      await updateAttestationResult(id, value as "acquis" | "non_acquis");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadOne(inscription: Inscription) {
    generateAttestationPDF(session, inscription, formateur);
  }

  function handleDownloadAll() {
    generateAllAttestationsPDF(session, inscriptionsWithResult, formateur);
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
            disabled={!hasAnyResult || loading}
          >
            <Download className="mr-2 h-4 w-4" />
            Attestations de fin de formation
          </Button>
          {inscriptions.length === 0 || loading ? (
            <Button variant="outline" disabled>
              <Files className="mr-2 h-4 w-4" />
              Toutes les FISE
            </Button>
          ) : (
            <MultipleFisePDFDownload
              session={session}
              inscriptions={inscriptions}
              formateur={formateur}
              organismeLogoBase64={organismeLogoBase64}
              className={buttonVariants({ variant: "outline" })}
            >
              {({ loading: pdfLoading }) => (
                <>
                  <Files className="mr-2 h-4 w-4" />
                  {pdfLoading ? "Génération..." : "Toutes les FISE"}
                </>
              )}
            </MultipleFisePDFDownload>
          )}
          {inscriptions.length === 0 || loading ? (
            <Button variant="outline" disabled>
              <FileText className="mr-2 h-4 w-4" />
              PV de formation
            </Button>
          ) : (
            <PvPDFDownload
              session={{
                ...session,
                endDate:
                  session.slots.length > 0
                    ? new Date(
                        Math.max(
                          ...session.slots.map((s) =>
                            new Date(s.date).getTime()
                          )
                        )
                      )
                    : null,
              }}
              inscriptions={inscriptions}
              formateur={formateur}
              className={buttonVariants({ variant: "outline" })}
            >
              {({ loading: pdfLoading }) => (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {pdfLoading ? "Génération..." : "PV de formation"}
                </>
              )}
            </PvPDFDownload>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {inscriptions.length === 0 ? (
            <p className="text-muted-foreground bg-muted/20 rounded-lg border py-4 text-center text-sm">
              Aucun stagiaire inscrit
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
                    value={inscription.attestationResult ?? ""}
                    onValueChange={(val) =>
                      handleUpdateResult(inscription.id, val)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="Non défini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acquis">Acquis</SelectItem>
                      <SelectItem value="non_acquis">Non Acquis</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownloadOne(inscription)}
                    disabled={!inscription.attestationResult || loading}
                    title="Télécharger l'attestation de fin de formation"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>

                  {loading ? (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled
                      title="Télécharger la FISE"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Button>
                  ) : (
                    <SingleFisePDFDownload
                      session={session}
                      inscription={inscription}
                      formateur={formateur}
                      organismeLogoBase64={organismeLogoBase64}
                      className={buttonVariants({
                        variant: "outline",
                        size: "icon",
                        className: "h-8 w-8",
                      })}
                    >
                      {({ loading: pdfLoading }) => (
                        <ClipboardList
                          className={`h-4 w-4 ${pdfLoading ? "animate-pulse" : ""}`}
                        />
                      )}
                    </SingleFisePDFDownload>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
