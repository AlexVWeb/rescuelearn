import { Suspense } from "react";
import {
  getSessionDetails,
  getAllTrainees,
  getFormateur,
  getMonOrganisme,
  getAssignableFormateurs,
} from "../../actions";
import { toPdfFormateur } from "../../lib/formateurs";
import { getLogoAsBase64 } from "@/lib/organisme-logo";
import { notFound } from "next/navigation";
import { SessionWorkspace } from "../components/session-workspace";
import { SessionDetailSkeleton } from "../components/session-detail-skeleton";
import { TrainingSession, Slot, Inscription } from "../../types";

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
  let organismeLogoBase64: string | null = null;
  try {
    [session, allTrainees, formateur, assignableFormateurs] = await Promise.all(
      [
        getSessionDetails(id),
        getAllTrainees(),
        getFormateur(),
        getAssignableFormateurs(),
      ]
    );
    formateur = toPdfFormateur(
      session.formateurs.map((f) => f.user),
      formateur
    );
    const organisme = await getMonOrganisme();
    if (organisme?.logo) {
      organismeLogoBase64 = await getLogoAsBase64(organisme.logo);
    }
  } catch {
    return notFound();
  }

  return (
    <Suspense fallback={<SessionDetailSkeleton />}>
      <SessionWorkspace
        session={
          session as TrainingSession & {
            slots: Slot[];
            inscriptions: Inscription[];
          }
        }
        allTrainees={allTrainees}
        formateur={formateur ?? { lastName: null, firstName: null }}
        assignableFormateurs={assignableFormateurs}
        organismeLogoBase64={organismeLogoBase64}
      />
    </Suspense>
  );
}
