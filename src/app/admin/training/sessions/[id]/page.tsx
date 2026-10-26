import { Suspense } from "react";
import {
  getSessionDetails,
  getAllTrainees,
  getFormateur,
  getMonOrganisme,
  getAssignableFormateurs,
  getAttestationSigning,
  getSessionEvaluations,
} from "../../actions";
import { toPdfFormateur } from "../../lib/formateurs";
import { getLogoAsBase64 } from "@/lib/organisme-logo";
import type { DocumentOrganisme } from "@/lib/documents/registry";
import { notFound } from "next/navigation";
import { SessionWorkspace } from "../components/session-workspace";
import { SessionDetailSkeleton } from "../components/session-detail-skeleton";
import {
  TrainingSession,
  Slot,
  Inscription,
  SessionDocument,
} from "../../types";

export default async function SessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let session;
  let allTrainees;
  let formateur;
  let assignableFormateurs;
  let attestationSigning;
  let evaluations;
  let organismeLogoBase64: string | null = null;
  let documentOrganisme: DocumentOrganisme | null = null;
  try {
    [
      session,
      allTrainees,
      formateur,
      assignableFormateurs,
      attestationSigning,
      evaluations,
    ] = await Promise.all([
      getSessionDetails(id),
      getAllTrainees(),
      getFormateur(),
      getAssignableFormateurs(),
      getAttestationSigning(id),
      getSessionEvaluations(id),
    ]);
    formateur = toPdfFormateur(
      session.formateurs.map((f) => f.user),
      formateur
    );
    const organisme = await getMonOrganisme();
    if (organisme) {
      documentOrganisme = {
        name: organisme.name,
        city: organisme.city,
        federation: organisme.federation,
        federationName: organisme.federationName,
        documentHeader: organisme.documentHeader,
      };
    }
    if (organisme?.logo) {
      organismeLogoBase64 = await getLogoAsBase64(organisme.logo);
    }
  } catch {
    return notFound();
  }
  if (!documentOrganisme) return notFound();

  return (
    <Suspense fallback={<SessionDetailSkeleton />}>
      <SessionWorkspace
        session={
          session as TrainingSession & {
            slots: Slot[];
            inscriptions: Inscription[];
            documents: SessionDocument[];
          }
        }
        allTrainees={allTrainees}
        formateur={formateur ?? { lastName: null, firstName: null }}
        assignableFormateurs={assignableFormateurs}
        attestationSigning={attestationSigning}
        evaluations={evaluations}
        organismeLogoBase64={organismeLogoBase64}
        organisme={documentOrganisme}
      />
    </Suspense>
  );
}
