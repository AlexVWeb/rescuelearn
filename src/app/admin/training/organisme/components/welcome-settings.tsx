"use client";

import { useSearchParams } from "next/navigation";
import { TermsCard } from "./terms-card";
import { WelcomeKitEditor, type KitView } from "./welcome-kit-editor";

export function WelcomeSettings({
  terms,
  canEditTerms,
  kits,
}: {
  terms: { version: string | null; updatedAt: Date } | null;
  canEditTerms: boolean;
  kits: KitView[];
}) {
  // ?type= : lien « Modifier le modèle » depuis une session
  const initialType = useSearchParams().get("type");

  return (
    <>
      <TermsCard terms={terms} canEditTerms={canEditTerms} />
      <WelcomeKitEditor kits={kits} initialType={initialType} />
    </>
  );
}
