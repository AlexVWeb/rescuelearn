import React from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

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
      className="bg-card relative overflow-hidden rounded-xl border p-6 shadow-sm"
      aria-label="Étapes de configuration"
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Premiers pas
          </h2>
          <p className="text-sm text-slate-500">
            Configurez au mieux votre organisme de formation.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:text-right">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {completedCount} / {checklistItems.length} étapes
          </span>
          <span className="text-muted-foreground text-xs">
            ({progressPercentage}%)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Checklist Steps Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {checklistItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-all ${
              item.completed
                ? "border-slate-200 bg-slate-50/50 dark:bg-slate-900/10"
                : "bg-card border-dashed"
            }`}
          >
            {item.completed ? (
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-green-600"
                aria-label="Complété"
              />
            ) : (
              <Circle
                className="h-5 w-5 shrink-0 text-slate-300"
                aria-label="En attente"
              />
            )}
            <span
              className={`text-sm font-medium ${item.completed ? "text-slate-600 line-through" : "text-slate-900 dark:text-white"}`}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
