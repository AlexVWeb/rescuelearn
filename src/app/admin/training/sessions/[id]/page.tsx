import { Suspense } from "react";
import {
  getSessionDetails,
  getAllTrainees,
  getFormateur,
  getMonOrganisme,
} from "../../actions";
import { getLogoAsBase64 } from "@/lib/organisme-logo";
import { notFound } from "next/navigation";
import { SessionTabsLayout } from "../components/session-tabs-layout";
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
  let organismeLogoBase64: string | null = null;
  try {
    [session, allTrainees, formateur] = await Promise.all([
      getSessionDetails(id),
      getAllTrainees(),
      getFormateur(),
    ]);
    const organisme = await getMonOrganisme();
    if (organisme?.logo) {
      organismeLogoBase64 = await getLogoAsBase64(organisme.logo);
    }
  } catch (e) {
    return notFound();
  }

  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SessionTabsLayout
        session={
          session as TrainingSession & {
            slots: Slot[];
            inscriptions: Inscription[];
          }
        }
        allTrainees={allTrainees}
        formateur={formateur}
        organismeLogoBase64={organismeLogoBase64}
      />
    </Suspense>
  );
}
