"use client";
import { logger } from "@/lib/logger";

import { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  ClipboardList,
  FileDown,
  Files,
  FileText,
  Loader2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateAttestationPDF,
  generateAllAttestationsPDF,
} from "../../../../lib/pdf-attestation-fin-formation-psc-export";
import {
  generateFicheEvaluationPDF,
  generateAllFichesEvaluationPDF,
} from "../../../../lib/pdf-fiche-evaluation-formative-PSC";
import { downloadFisePDF, downloadAllFisePDF } from "../../../../lib/pdf-fise";
import { downloadPvPDF } from "../../../../lib/pdf-pv";
import { generateEmargementPDF } from "../../../../lib/pdf-emargement";
import type { Inscription, Slot } from "../../../../types";
import type { AttestationSigning } from "@/app/admin/training/actions";
import { AttestationsPublication } from "./attestations-publication";

interface DocumentsSectionProps {
  session: {
    id: string;
    attestationsPublishedAt: Date | null;
    title: string;
    type: string;
    location: string;
    startDate: Date | null;
    endDate?: Date | null;
    slots: Slot[];
    isFC?: boolean;
    status?: string;
  };
  inscriptions: Inscription[];
  formateur: { lastName: string | null; firstName: string | null };
  signing: AttestationSigning;
  equipePedagogique?: string[];
  responsablePedagogique?: string;
  organismeLogoBase64?: string | null;
}

export function DocumentsSection({
  session,
  inscriptions,
  formateur,
  signing,
  equipePedagogique,
  responsablePedagogique,
  organismeLogoBase64,
}: DocumentsSectionProps) {
  // PDF en cours de génération : clé du document ou id d'une inscription
  const [generating, setGenerating] = useState<string | null>(null);

  const isPSC = session.type === "PSC";
  const withResult = inscriptions.filter((i) => !!i.attestationResult);
  const empty = inscriptions.length === 0;
  // Signées : on sert les PDF figés, jamais un nouveau rendu
  const signedIds = new Set(signing.signature?.inscriptionIds ?? []);
  const signedUrl = (inscriptionId?: string) =>
    `/api/admin/attestations/${session.id}${inscriptionId ? `?inscription=${inscriptionId}` : ""}`;

  async function generate(key: string, fn: () => unknown) {
    setGenerating(key);
    try {
      await fn();
    } catch (e) {
      logger.error(e);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setGenerating(null);
    }
  }

  function downloadPv() {
    const times = session.slots.map((s) => new Date(s.date).getTime());
    return downloadPvPDF({
      session: {
        ...session,
        endDate: times.length > 0 ? new Date(Math.max(...times)) : null,
      },
      inscriptions,
      formateur,
    });
  }

  const sessionDocuments = [
    {
      key: "pv",
      icon: FileText,
      title: "PV de formation",
      description: "Procès-verbal avec l'issue de chaque stagiaire.",
      disabled: empty,
      run: downloadPv,
    },
    {
      key: "emargement",
      icon: ClipboardCheck,
      title: "Feuille d'émargement",
      description:
        session.slots.length === 0
          ? "Ajoutez d'abord des créneaux au programme."
          : "Présences par créneau, à signer ou à archiver.",
      disabled: empty || session.slots.length === 0,
      run: () => generateEmargementPDF(session, session.slots, inscriptions),
    },
    {
      key: "all-fise",
      icon: Files,
      title: "Toutes les FISE",
      description: "Fiches individuelles de suivi, en un seul PDF.",
      disabled: empty,
      run: () =>
        downloadAllFisePDF({
          session,
          inscriptions,
          formateur,
          equipePedagogique,
          responsablePedagogique,
          organismeLogoBase64,
        }),
    },
    signing.signature
      ? {
          key: "all-attestations",
          icon: ScrollText,
          title: "Attestations de fin de formation",
          description: "Versions signées, en un seul PDF.",
          disabled: signedIds.size === 0,
          run: () => {
            window.location.href = signedUrl();
          },
        }
      : {
          key: "all-attestations",
          icon: ScrollText,
          title: "Attestations (aperçu non signé)",
          description:
            withResult.length > 0
              ? `${withResult.length} stagiaire${withResult.length > 1 ? "s" : ""} avec un résultat saisi.`
              : "Saisissez d'abord les résultats dans l'onglet Résultats.",
          disabled: withResult.length === 0,
          run: () => generateAllAttestationsPDF(session, withResult, formateur),
        },
    ...(isPSC
      ? [
          {
            key: "all-fiches",
            icon: ClipboardList,
            title: "Fiches d'évaluation formative",
            description: "Une fiche par stagiaire (PSC).",
            disabled: empty,
            run: () =>
              generateAllFichesEvaluationPDF(
                session,
                inscriptions,
                formateur,
                organismeLogoBase64
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <AttestationsPublication
        sessionId={session.id}
        publishedAt={session.attestationsPublishedAt}
        inscriptions={inscriptions}
        signing={signing}
      />
      <Card>
        <CardHeader>
          <CardTitle>Documents de la session</CardTitle>
          <CardDescription>
            Générés à partir des données actuelles de la session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {sessionDocuments.map((doc) => (
              <li
                key={doc.key}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <doc.icon
                    className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {doc.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="self-end sm:self-auto"
                  disabled={doc.disabled || generating !== null}
                  onClick={() => generate(doc.key, doc.run)}
                  aria-label={`Télécharger : ${doc.title}`}
                >
                  {generating === doc.key ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  {generating === doc.key ? "Génération…" : "Télécharger"}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents par stagiaire</CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <p className="text-muted-foreground bg-muted/20 rounded-lg border border-dashed py-6 text-center text-sm">
              Aucun stagiaire inscrit à cette session.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {inscriptions.map((inscription) => {
                const name =
                  `${inscription.trainee?.firstName ?? ""} ${inscription.trainee?.lastName ?? ""}`.trim();
                const isSigned = signedIds.has(inscription.id);
                return (
                  <li
                    key={inscription.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium">{name}</span>
                    <div className="flex flex-wrap gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !inscription.attestationResult || generating !== null
                        }
                        onClick={() => {
                          if (isSigned) {
                            window.location.href = signedUrl(inscription.id);
                            return;
                          }
                          generate(`${inscription.id}-attestation`, () =>
                            generateAttestationPDF(
                              session,
                              inscription,
                              formateur
                            )
                          );
                        }}
                        aria-label={
                          isSigned
                            ? `Attestation signée de ${name}`
                            : `Aperçu non signé de l'attestation de ${name}`
                        }
                        title={
                          inscription.attestationResult
                            ? undefined
                            : "Résultat de l'attestation non saisi"
                        }
                      >
                        <ScrollText className="mr-1 h-4 w-4" />
                        Attestation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={generating !== null}
                        onClick={() =>
                          generate(inscription.id, () =>
                            downloadFisePDF({
                              session,
                              inscription,
                              formateur,
                              equipePedagogique,
                              responsablePedagogique,
                              organismeLogoBase64,
                            })
                          )
                        }
                        aria-label={`FISE de ${name}`}
                      >
                        {generating === inscription.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Files className="mr-1 h-4 w-4" />
                        )}
                        FISE
                      </Button>
                      {isPSC && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={generating !== null}
                          onClick={() =>
                            generateFicheEvaluationPDF(
                              session,
                              inscription,
                              formateur,
                              organismeLogoBase64
                            )
                          }
                          aria-label={`Fiche d'évaluation de ${name}`}
                        >
                          <ClipboardList className="mr-1 h-4 w-4" />
                          Fiche éval.
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
