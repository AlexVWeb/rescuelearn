import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  checklist: {
    profileCompleted: boolean;
    firstSessionCreated: boolean;
    trainersInvited: boolean;
    attestationGenerated: boolean;
  };
}

export function OnboardingChecklist({ checklist }: OnboardingChecklistProps) {
  const checklistItems = [
    {
      id: "profile",
      label: "Compléter votre profil",
      completed: checklist.profileCompleted,
      href: "/admin/profile",
    },
    {
      id: "session",
      label: "Créer votre première session",
      completed: checklist.firstSessionCreated,
      href: "/admin/training/sessions",
    },
    {
      id: "invite",
      label: "Inviter des formateurs",
      completed: checklist.trainersInvited,
      href: "/admin/users",
    },
    {
      id: "attestation",
      label: "Générer une attestation",
      completed: checklist.attestationGenerated,
      href: "/admin/training/sessions",
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progressPercentage = Math.round(
    (completedCount / checklistItems.length) * 100
  );

  if (progressPercentage >= 100) return null;

  return (
    <section
      className="bg-card rounded-2xl border p-5 sm:p-6"
      aria-labelledby="onboarding-title"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="onboarding-title" className="text-base font-semibold">
          Premiers pas
        </h2>
        <p className="text-muted-foreground text-sm tabular-nums">
          {completedCount} étape{completedCount > 1 ? "s" : ""} sur{" "}
          {checklistItems.length}
        </p>
      </div>

      <div
        className="bg-muted mb-4 h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Avancement des premiers pas"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercentage}
      >
        <div
          className="bg-brand h-full rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {checklistItems.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "focus-visible:ring-ring flex h-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                item.completed
                  ? "text-muted-foreground bg-muted/50 border-transparent"
                  : "hover:bg-muted text-foreground font-medium"
              )}
            >
              {item.completed ? (
                <CheckCircle2
                  className="text-success h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="text-muted-foreground/50 h-5 w-5 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>
                {item.label}
                {item.completed && <span className="sr-only"> (fait)</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
