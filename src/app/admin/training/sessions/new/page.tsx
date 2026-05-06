import { Suspense } from "react";
import { SessionTabsLayout } from "../components/session-tabs-layout";

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SessionTabsLayout isNew={true} />
    </Suspense>
  );
}
