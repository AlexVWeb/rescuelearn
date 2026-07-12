import { Metadata } from "next";
import { glasgowMetadata } from "./metadata";
import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import { redirect } from "next/navigation";

export const metadata: Metadata = glasgowMetadata;
export const dynamic = "force-dynamic";

/**
 * Layout pour la section Glasgow
 *
 * Ce layout applique les métadonnées spécifiques à la section
 * d'entraînement au Score de Glasgow.
 */
export default async function GlasgowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await isFeatureEnabled(FeatureKey.GLASGOW_SYSTEM);
  if (!enabled) {
    redirect("/section-disabled");
  }
  return children;
}
