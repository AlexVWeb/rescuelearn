import { pdf } from "@react-pdf/renderer";
import dayjs from "dayjs";
import { AttestationDocument } from "@/app/admin/training/lib/pdf-attestation-fin-formation-psc-export";
import { buildEmargementPDF } from "@/app/admin/training/lib/pdf-emargement";
import { buildAllFichesEvaluationPDF } from "@/app/admin/training/lib/pdf-fiche-evaluation-formative-PSC";
import { MultipleFiseDocument } from "@/app/admin/training/lib/pdf-fise";
import type { Inscription, Slot } from "@/app/admin/training/types";
import { PvDocument } from "@/lib/documents/croix-blanche/pdf-pv";
import type { TemplateId } from "@/lib/documents/catalog";
import {
  documentHeaderLines,
  type DocumentOrganisme,
} from "@/lib/documents/registry";

// Aperçus des modèles : vrais générateurs, données de session fictives,
// mais logo et en-tête réels de l'organisme.

export type PreviewContext = {
  organisme: DocumentOrganisme;
  logoBase64: string | null;
};

const SESSION_ID = "apercu";

function sampleSlots(): Slot[] {
  // Slot.date est un @db.Date : minuit UTC
  const day = (offset: number) =>
    new Date(`${dayjs().add(offset, "day").format("YYYY-MM-DD")}T00:00:00Z`);
  return [
    {
      id: "slot-1",
      label: "Matin",
      date: day(7),
      startTime: "09:00",
      endTime: "12:30",
      trainingSessionId: SESSION_ID,
    },
    {
      id: "slot-2",
      label: "Après-midi",
      date: day(7),
      startTime: "13:30",
      endTime: "17:00",
      trainingSessionId: SESSION_ID,
    },
  ];
}

function sampleInscriptions(): Inscription[] {
  const trainees = [
    ["Mme", "Marie", "Dupont", "1994-03-12", "Lyon"],
    ["M.", "Lucas", "Martin", "1988-11-02", "Grenoble"],
  ] as const;
  return trainees.map(
    ([civility, firstName, lastName, dob, birthPlace], i) => ({
      id: `inscription-${i + 1}`,
      traineeId: `trainee-${i + 1}`,
      trainingSessionId: SESSION_ID,
      status: "présent",
      attestationResult: "acquis",
      trainee: {
        id: `trainee-${i + 1}`,
        civility,
        firstName,
        lastName,
        email: null,
        phone: null,
        dateOfBirth: new Date(`${dob}T00:00:00Z`),
        birthPlace,
        address: null,
        organismeId: SESSION_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      emargements: [],
    })
  );
}

const FORMATEUR = { lastName: "Durand", firstName: "Paul" };

function sampleSession(type: string, location: string) {
  const slots = sampleSlots();
  return {
    title: `Session exemple ${type}`,
    type,
    location,
    startDate: slots[0].date,
    endDate: slots[slots.length - 1].date,
    slots,
    isFC: false,
  };
}

/** PDF d'aperçu d'un modèle, généré dans le navigateur. */
export async function buildTemplatePreview(
  id: TemplateId,
  { organisme, logoBase64 }: PreviewContext
): Promise<Blob> {
  const location = organisme.city || "Lieu de la formation";
  const inscriptions = sampleInscriptions();
  const headerLines = documentHeaderLines(organisme);

  switch (id) {
    case "emargement":
      return buildEmargementPDF(
        sampleSession("PSC", location),
        sampleSlots(),
        inscriptions
      ).output("blob");
    case "fiche-formative":
      return buildAllFichesEvaluationPDF(
        sampleSession("PSC", location),
        inscriptions.slice(0, 1),
        FORMATEUR,
        logoBase64
      ).output("blob");
    case "attestation":
      return pdf(
        <AttestationDocument
          session={sampleSession("PSC", location)}
          inscriptions={inscriptions.slice(0, 1)}
          formateur={FORMATEUR}
        />
      ).toBlob();
    case "fise-psc":
    case "fise-pse1":
    case "fise-pse2":
    case "grille-pse1":
    case "grille-pse2": {
      const type = {
        "fise-psc": "PSC",
        "fise-pse1": "PSE1",
        "fise-pse2": "PSE2",
        "grille-pse1": "PSE1",
        "grille-pse2": "PSE2",
      }[id];
      return pdf(
        <MultipleFiseDocument
          session={sampleSession(type, location)}
          inscriptions={inscriptions.slice(0, 1)}
          formateur={FORMATEUR}
          responsablePedagogique="Paul Durand"
          organismeLogoBase64={logoBase64}
          headerLines={headerLines}
        />
      ).toBlob();
    }
    case "pv":
      return pdf(
        <PvDocument
          session={sampleSession("PSC", location)}
          inscriptions={inscriptions}
          formateur={FORMATEUR}
          headerLines={headerLines}
        />
      ).toBlob();
  }
}
