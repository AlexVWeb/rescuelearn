"use client";

import { useState } from "react";
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
import { Download, FileDown } from "lucide-react";
import { updateAttestationResult } from "../../../../actions";
import {
  generateAttestationPDF,
  generateAllAttestationsPDF,
} from "../../../../lib/pdf-attestation-fin-formation-export";
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
    name: string | null;
  };
}

export function FormationTab({
  sessionId: _sessionId,
  session,
  inscriptions,
  formateur,
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
          <CardTitle>Attestations de fin de formation</CardTitle>
          <CardDescription>
            Validez les résultats et générez les attestations PDF
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={handleDownloadAll}
          disabled={!hasAnyResult || loading}
          className="shrink-0"
        >
          <Download className="mr-2 h-4 w-4" />
          Tout télécharger
        </Button>
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
                    title="Télécharger l'attestation"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
