import { getSessionDetails, getAllTrainees } from "../../actions";
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
  try {
    session = await getSessionDetails(id);
    allTrainees = await getAllTrainees();
  } catch (e) {
    return notFound();
  }

  return (
    <SessionTabsLayout 
      session={session as TrainingSession & { slots: Slot[]; inscriptions: Inscription[] }} 
      allTrainees={allTrainees} 
    />
  );
}
