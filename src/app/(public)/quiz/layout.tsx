import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { isFeatureEnabled, FeatureKey } from "@/lib/features";
import { redirect } from "next/navigation";

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
