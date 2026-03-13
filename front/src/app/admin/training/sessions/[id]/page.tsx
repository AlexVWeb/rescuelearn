import { getSessionDetails, getAllTrainees, getFormateur } from "../../actions";
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
  try {
    [session, allTrainees, formateur] = await Promise.all([
      getSessionDetails(id),
      getAllTrainees(),
      getFormateur(),
    ]);
  } catch (e) {
    return notFound();
  }

  return (
    <SessionTabsLayout
      session={
        session as TrainingSession & {
          slots: Slot[];
          inscriptions: Inscription[];
        }
      }
      allTrainees={allTrainees}
      formateur={formateur}
    />
  );
}
