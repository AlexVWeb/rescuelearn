import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import { redirect } from "next/navigation";
import { metadata as quizMetadata } from "./metadata";

export const metadata: Metadata = quizMetadata;

export const dynamic = "force-dynamic";

export default async function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await isFeatureEnabled(FeatureKey.QUIZ_SYSTEM);
  if (!enabled) {
    redirect("/section-disabled");
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
