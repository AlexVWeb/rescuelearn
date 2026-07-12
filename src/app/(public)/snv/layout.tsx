import { Metadata } from "next";
import { metadata as snvMetadata } from "./metadata";
import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import { redirect } from "next/navigation";

export const metadata: Metadata = snvMetadata;
export const dynamic = "force-dynamic";

export default async function SNVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await isFeatureEnabled(FeatureKey.SNV_SYSTEM);
  if (!enabled) {
    redirect("/section-disabled");
  }
  return children;
}
