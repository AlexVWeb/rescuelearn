"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";
import { SessionHeader } from "./session-header";
import { SessionForm } from "./session-form";
import { SlotsTab } from "../[id]/components/slots-tab";
import { InscriptionsTab } from "../[id]/components/inscriptions-tab";
import { EmargementTab } from "../[id]/components/emargement";
import { GroupsTab } from "../[id]/components/groups";
import { boardKey } from "../[id]/components/groups/board-utils";
import { ResultsSection } from "../[id]/components/close/results-section";
import { DocumentsSection } from "../[id]/components/close/documents-section";
import type { DocumentOrganisme } from "@/lib/documents/registry";
import { SupportsTab } from "../[id]/components/supports/supports-tab";
import { EvaluationsSection } from "../[id]/components/close/evaluations-section";
import {
  Inscription,
  SessionDocument,
  SessionFormateurUser,
  Slot,
  Trainee,
  TrainingSession,
} from "@/app/admin/training/types";
import { formatFormateurName } from "@/app/admin/training/lib/formateurs";
import type {
  AttestationSigning,
  SessionEvaluationSummary,
} from "@/app/admin/training/actions";
import {
  checkGroups,
  isCountedInscription,
} from "@/app/admin/training/lib/group-rules";
import {
  SESSION_PHASES,
  computeProgress,
  resolveView,
  sectionsOf,
  type SessionPhase,
  type SessionSection,
} from "@/app/admin/training/lib/session-progress";

interface SessionWorkspaceProps {
  session: TrainingSession & {
    slots: Slot[];
    inscriptions: Inscription[];
    documents?: SessionDocument[];
  };
  allTrainees: Trainee[];
  formateur: { lastName: string | null; firstName: string | null };
  assignableFormateurs: SessionFormateurUser[];
  attestationSigning: AttestationSigning;
  evaluations: SessionEvaluationSummary[] | null;
  /** Sections masquées (module d'organisme inactif) */
  hiddenSections: SessionSection[];
  organismeLogoBase64?: string | null;
  organisme: DocumentOrganisme;
}

// Fondu court à l'affichage d'un panneau, désactivé si mouvement réduit
const panelMotion =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150";

export function SessionWorkspace({
  session,
  allTrainees,
  formateur,
  assignableFormateurs,
  attestationSigning,
  evaluations,
  hiddenSections,
  organismeLogoBase64,
  organisme,
}: SessionWorkspaceProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  const { slots, inscriptions } = session;
  const groups = session.groups ?? [];
  const assignedFormateurs = (session.formateurs ?? []).map((f) => f.user);

  const view = resolveView(
    {
      phase: searchParams.get("phase"),
      section: searchParams.get("section"),
      tab: searchParams.get("tab"),
    },
    session.status,
    hiddenSections
  );
  // `?edit=1` (liste des sessions) et l'ancien `?tab=settings` ouvrent l'édition
  const editRequested =
    searchParams.get("edit") === "1" || searchParams.get("tab") === "settings";
  const [editOpen, setEditOpen] = useState(editRequested);

  function updateUrl(apply: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    params.delete("edit");
    apply(params);
    // API History native : Next synchronise useSearchParams sans refaire le
    // rendu serveur, le changement d'étape est donc instantané
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function navigate(phase: SessionPhase, section?: SessionSection) {
    updateUrl((params) => {
      params.set("phase", phase);
      params.set("section", section ?? sectionsOf(phase, hiddenSections)[0]);
    });
  }

  function handleEditOpenChange(open: boolean) {
    setEditOpen(open);
    if (!open && editRequested) {
      updateUrl((params) => {
        params.set("phase", view.phase);
        params.set("section", view.section);
      });
    }
  }

  // Mêmes règles que le tableau des groupes, pour l'alerte de la phase Préparer
  const assignedIds = new Set(assignedFormateurs.map((f) => f.id));
  const groupIds = new Set(groups.map((g) => g.id));
  const counted = inscriptions.filter((i) => isCountedInscription(i.status));
  const groupWarnings = checkGroups({
    type: session.type,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      formateurId:
        g.formateurId && assignedIds.has(g.formateurId) ? g.formateurId : null,
      traineeCount: counted.filter((i) => i.groupId === g.id).length,
    })),
    formateurCount: assignedFormateurs.length,
    unassignedCount: counted.filter(
      (i) => !i.groupId || !groupIds.has(i.groupId)
    ).length,
  });

  const progress = computeProgress({
    slots,
    inscriptions,
    groupWarningCount: groupWarnings.length,
  });

  const phaseStatus: Record<
    SessionPhase,
    { text: string; srText: string; tone?: "done" | "warning" }
  > = {
    prepare: progress.prepare.ready
      ? { text: "Prête", srText: "préparation terminée", tone: "done" }
      : progress.prepare.groupWarningCount > 0
        ? {
            text: `${progress.prepare.groupWarningCount} alerte${progress.prepare.groupWarningCount > 1 ? "s" : ""}`,
            srText: `${progress.prepare.groupWarningCount} alerte(s) sur les groupes`,
            tone: "warning",
          }
        : { text: "À compléter", srText: "préparation à compléter" },
    animate: {
      text: `${progress.animate.validated}/${progress.animate.expected}`,
      srText: `${progress.animate.validated} émargements validés sur ${progress.animate.expected}`,
      tone:
        progress.animate.expected > 0 &&
        progress.animate.validated === progress.animate.expected
          ? "done"
          : undefined,
    },
    close: {
      text: `${progress.close.decided}/${progress.close.total}`,
      srText: `${progress.close.decided} issues saisies sur ${progress.close.total}`,
      tone:
        progress.close.total > 0 &&
        progress.close.decided === progress.close.total
          ? "done"
          : undefined,
    },
  };

  const sectionHints: Partial<Record<SessionSection, string>> = {
    programme: String(slots.length),
    stagiaires: String(inscriptions.length),
    groupes:
      groupWarnings.length > 0
        ? `${groupWarnings.length} ⚠`
        : String(groups.length),
    supports: String(session.documents?.length ?? 0),
  };

  const sectionContent: Record<SessionSection, ReactNode> = {
    programme: (
      <SlotsTab
        sessionId={session.id}
        slots={slots}
        sessionStartDate={session.startDate}
        sessionEndDate={session.endDate}
        sessionStatus={session.status}
      />
    ),
    stagiaires: (
      <InscriptionsTab
        sessionId={session.id}
        sessionStatus={session.status}
        inscriptions={inscriptions}
        allTrainees={allTrainees}
        maxTrainees={session.maxTrainees}
      />
    ),
    groupes: (
      <GroupsTab
        // Remonte le tableau quand groupes, affectations ou statuts changent
        key={`${boardKey(groups, inscriptions)}|${inscriptions
          .map((i) => i.status)
          .join(",")}`}
        sessionId={session.id}
        sessionType={session.type}
        sessionStatus={session.status}
        groups={groups}
        inscriptions={inscriptions}
        formateurs={assignedFormateurs}
      />
    ),
    supports: (
      <SupportsTab sessionId={session.id} documents={session.documents ?? []} />
    ),
    emargement: (
      <EmargementTab
        sessionId={session.id}
        sessionTitle={session.title}
        sessionLocation={session.location}
        sessionType={session.type}
        sessionStatus={session.status}
        slots={slots}
        inscriptions={inscriptions}
      />
    ),
    resultats: (
      <ResultsSection
        sessionId={session.id}
        sessionStatus={session.status}
        slots={slots}
        inscriptions={inscriptions}
      />
    ),
    documents: (
      <DocumentsSection
        session={{
          id: session.id,
          attestationsPublishedAt: session.attestationsPublishedAt ?? null,
          title: session.title,
          type: session.type,
          location: session.location,
          startDate: session.startDate,
          endDate: session.endDate,
          slots,
          isFC: session.isFC,
          status: session.status,
        }}
        inscriptions={inscriptions}
        formateur={formateur}
        signing={attestationSigning}
        equipePedagogique={assignedFormateurs
          .map(formatFormateurName)
          .filter(Boolean)}
        responsablePedagogique={
          session.responsablePedagogique
            ? formatFormateurName(session.responsablePedagogique)
            : undefined
        }
        organismeLogoBase64={organismeLogoBase64}
        organisme={organisme}
      />
    ),
    evaluations: <EvaluationsSection evaluations={evaluations} />,
  };

  // Les contenus formatent des dates dans le fuseau du navigateur : rendus
  // après hydratation, dans une zone de hauteur réservée (pas de saut).
  function renderSection(section: SessionSection) {
    if (!mounted) return <SectionSkeleton />;
    return sectionContent[section];
  }

  return (
    <div className="space-y-6">
      <SessionHeader
        session={session}
        inscriptionCount={inscriptions.length}
        assignedFormateurs={assignedFormateurs}
        assignableFormateurs={assignableFormateurs}
        onEdit={() => setEditOpen(true)}
      />

      <Tabs
        value={view.phase}
        onValueChange={(value) => navigate(value as SessionPhase)}
        className="gap-4"
      >
        <nav
          aria-label="Étapes de la session"
          className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 -mx-4 px-4 py-2 backdrop-blur"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 group-data-[orientation=horizontal]/tabs:h-auto">
            {(Object.keys(SESSION_PHASES) as SessionPhase[]).map(
              (phase, index) => {
                const status = phaseStatus[phase];
                return (
                  <TabsTrigger
                    key={phase}
                    value={phase}
                    className="h-auto min-h-11 flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-2"
                  >
                    <span>
                      <span
                        aria-hidden
                        className="text-muted-foreground mr-1 hidden sm:inline"
                      >
                        {index + 1}.
                      </span>
                      {SESSION_PHASES[phase].label}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex items-center gap-1 text-xs font-normal tabular-nums",
                        status.tone === "done" && "text-success",
                        status.tone === "warning" && "text-warning-foreground",
                        !status.tone && "text-muted-foreground"
                      )}
                    >
                      {status.tone === "done" && (
                        <CircleCheck className="size-3.5" />
                      )}
                      {status.tone === "warning" && (
                        <TriangleAlert className="size-3.5" />
                      )}
                      {status.text}
                    </span>
                    <span className="sr-only">, {status.srText}</span>
                  </TabsTrigger>
                );
              }
            )}
          </TabsList>
        </nav>

        {(Object.keys(SESSION_PHASES) as SessionPhase[]).map((phase) => {
          const sections = sectionsOf(phase, hiddenSections);
          return (
            <TabsContent key={phase} value={phase} className={panelMotion}>
              {sections.length === 1 ? (
                <div className="min-h-[400px]">
                  {renderSection(sections[0])}
                </div>
              ) : (
                <Tabs
                  value={view.phase === phase ? view.section : sections[0]}
                  onValueChange={(value) =>
                    navigate(phase, value as SessionSection)
                  }
                  className="gap-4"
                >
                  <div className="-mx-4 overflow-x-auto px-4">
                    <TabsList
                      variant="line"
                      aria-label={`Sections de l'étape ${SESSION_PHASES[phase].label}`}
                    >
                      {sections.map((section) => (
                        <TabsTrigger
                          key={section}
                          value={section}
                          className="px-3"
                        >
                          {
                            (
                              SESSION_PHASES[phase].sections as Record<
                                string,
                                string
                              >
                            )[section]
                          }
                          {sectionHints[section] && (
                            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs tabular-nums">
                              {sectionHints[section]}
                            </span>
                          )}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  {sections.map((section) => (
                    <TabsContent
                      key={section}
                      value={section}
                      className={cn("min-h-[400px]", panelMotion)}
                    >
                      {renderSection(section)}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Sheet open={editOpen} onOpenChange={handleEditOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Modifier la session</SheetTitle>
            <SheetDescription>
              Informations générales, capacité et statut de la formation.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <SessionForm
              sessionItem={session}
              members={assignableFormateurs}
              formateurIds={assignedFormateurs.map((f) => f.id)}
              onCancel={() => handleEditOpenChange(false)}
              onSuccess={() => handleEditOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
