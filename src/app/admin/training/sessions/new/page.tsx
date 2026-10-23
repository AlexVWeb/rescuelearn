import { getAssignableFormateurs } from "../../actions";
import { NewSessionForm } from "../components/new-session-form";

export default async function NewSessionPage() {
  const members = await getAssignableFormateurs();
  return <NewSessionForm members={members} />;
}
