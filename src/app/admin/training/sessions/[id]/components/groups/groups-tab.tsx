"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, TriangleAlert, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { logger } from "@/lib/logger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createGroup,
  deleteGroup,
  moveInscriptions,
  saveGeneratedGroups,
  updateGroup,
} from "@/app/admin/training/actions/groups";
import {
  buildGroups,
  checkGroups,
  getMaxPerGroup,
  isCountedInscription,
  requiredGroupCount,
  type GroupStrategy,
} from "@/app/admin/training/lib/group-rules";
import type {
  Inscription,
  SessionFormateurUser,
  TrainingGroup,
} from "@/app/admin/training/types";
import { GroupColumn } from "./group-column";
import { GenerateGroupsDialog } from "./generate-groups-dialog";
import {
  TraineeCard,
  TraineeCardContent,
  type BoardTrainee,
} from "./trainee-card";
import {
  UNASSIGNED,
  ageFromBirthDate,
  buildBoard,
  findContainer,
  moveItems,
  type Board,
} from "./board-utils";

interface GroupsTabProps {
  sessionId: string;
  sessionType: string;
  sessionStatus: string;
  groups: TrainingGroup[];
  inscriptions: Inscription[];
  formateurs: SessionFormateurUser[];
}

export function GroupsTab({
  sessionId,
  sessionType,
  sessionStatus,
  groups,
  inscriptions,
  formateurs,
}: GroupsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const readOnly = sessionStatus === "terminée" || sessionStatus === "annulée";

  const activeInscriptions = useMemo(
    () => inscriptions.filter((i) => isCountedInscription(i.status)),
    [inscriptions]
  );
  const trainees = useMemo(
    () =>
      new Map<string, BoardTrainee>(
        activeInscriptions.map((i) => [
          i.id,
          {
            inscriptionId: i.id,
            name:
              `${i.trainee?.lastName ?? ""} ${i.trainee?.firstName ?? ""}`.trim() ||
              "Apprenant",
            age: ageFromBirthDate(i.trainee?.dateOfBirth),
          },
        ])
      ),
    [activeInscriptions]
  );

  const [board, setBoard] = useState<Board>(() =>
    buildBoard(groups, activeInscriptions)
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const max = getMaxPerGroup(sessionType);
  const formateurIds = new Set(formateurs.map((f) => f.id));
  const columnLabel = (id: string) =>
    id === UNASSIGNED
      ? "Non affectés"
      : (groups.find((g) => g.id === id)?.name ?? "Groupe");
  const nameOf = (id: UniqueIdentifier) =>
    trainees.get(String(id))?.name ?? "Apprenant";

  const warnings = checkGroups({
    type: sessionType,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      // Un référent retiré de la session ne compte plus comme référent
      formateurId:
        g.formateurId && formateurIds.has(g.formateurId) ? g.formateurId : null,
      traineeCount: board[g.id]?.length ?? 0,
    })),
    formateurCount: formateurs.length,
    unassignedCount: board[UNASSIGNED].length,
  });

  // MouseSensor + TouchSensor (et non PointerSensor) : avec PointerSensor, le
  // pointerdown d'un toucher capture le drag et TouchSensor ne sert jamais.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function run(action: () => Promise<unknown>, onError?: () => void) {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        logger.error(e);
        onError?.();
        toast.error(
          e instanceof Error ? e.message : "Erreur lors de la mise à jour"
        );
      }
    });
  }

  function move(ids: string[], target: string) {
    const previous = board;
    setBoard(moveItems(board, ids, target));
    setSelected(new Set());
    run(
      () =>
        moveInscriptions(sessionId, ids, target === UNASSIGNED ? null : target),
      () => setBoard(previous)
    );
  }

  function generate(options: { count: number; strategy: GroupStrategy }) {
    const drafts = buildGroups(
      activeInscriptions.map((i) => ({
        inscriptionId: i.id,
        lastName: i.trainee?.lastName ?? "",
        firstName: i.trainee?.firstName ?? "",
        age: ageFromBirthDate(i.trainee?.dateOfBirth),
      })),
      formateurs.map((f) => f.id),
      options
    );
    run(async () => {
      await saveGeneratedGroups(sessionId, drafts);
      toast.success(`${drafts.length} groupe(s) généré(s)`);
    });
  }

  // Glisser un apprenant sélectionné emmène toute la sélection
  const draggedIds = (id: string) => (selected.has(id) ? [...selected] : [id]);
  // Apprenants réellement déplacés : la sélection peut couvrir plusieurs colonnes
  const movingIds = (id: string, to: string) =>
    draggedIds(id).filter((i) => findContainer(board, i) !== to);

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const to = findContainer(board, String(over.id));
    if (!to) return;
    const ids = movingIds(String(active.id), to);
    if (ids.length > 0) move(ids, to);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const extra = draggedIds(String(active.id)).length - 1;
      return `${nameOf(active.id)} saisi${
        extra > 0 ? `, avec ${extra} autre(s) apprenant(s) sélectionné(s)` : ""
      }.`;
    },
    onDragOver: ({ active, over }) => {
      const to = over && findContainer(board, String(over.id));
      return to
        ? `${nameOf(active.id)} au-dessus de ${columnLabel(to)}.`
        : `${nameOf(active.id)} hors d'un groupe.`;
    },
    onDragEnd: ({ active, over }) => {
      const to = over && findContainer(board, String(over.id));
      const moving = to ? movingIds(String(active.id), to) : [];
      if (!to || moving.length === 0) {
        return `${nameOf(active.id)} déposé, aucun changement.`;
      }
      // Annonce calculée sur le board d'avant le déplacement
      const count = (board[to] ?? []).length + moving.length;
      return `${nameOf(active.id)} déplacé vers ${columnLabel(to)}${
        to !== UNASSIGNED && max !== null ? `, ${count} sur ${max}` : ""
      }.`;
    },
    onDragCancel: ({ active }) => `Déplacement de ${nameOf(active.id)} annulé.`,
  };

  const columnIds = [...groups.map((g) => g.id), UNASSIGNED];
  const targetsFor = (current: string) =>
    columnIds
      .filter((id) => id !== current)
      .map((id) => ({ id, label: columnLabel(id) }));

  const totalTrainees = activeInscriptions.length;
  const required = requiredGroupCount(sessionType, totalTrainees);

  function renderColumn(id: string) {
    const group = groups.find((g) => g.id === id);
    const itemIds = board[id] ?? [];
    return (
      <GroupColumn
        key={id}
        id={id}
        itemIds={itemIds}
        max={max}
        readOnly={readOnly}
        group={group}
        formateurs={formateurs}
        onRename={(name) => group && run(() => updateGroup(group.id, { name }))}
        onFormateurChange={(formateurId) =>
          group && run(() => updateGroup(group.id, { formateurId }))
        }
        onDelete={() => group && run(() => deleteGroup(group.id))}
      >
        {itemIds.map((inscriptionId) => {
          const trainee = trainees.get(inscriptionId);
          if (!trainee) return null;
          return (
            <TraineeCard
              key={inscriptionId}
              trainee={trainee}
              readOnly={readOnly}
              selected={selected.has(inscriptionId)}
              targets={targetsFor(id)}
              onSelectedChange={(checked) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(inscriptionId);
                  else next.delete(inscriptionId);
                  return next;
                })
              }
              onMove={(target) => move([inscriptionId], target)}
            />
          );
        })}
      </GroupColumn>
    );
  }

  const activeTrainee = activeId ? trainees.get(activeId) : undefined;

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {totalTrainees} apprenants · {formateurs.length} formateur(s)
          {max !== null &&
            ` · ${sessionType} : ${max} max/formateur → ${required} groupe(s) requis`}
        </p>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={isPending}
              onClick={() => run(() => createGroup(sessionId))}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Groupe
            </Button>
            <GenerateGroupsDialog
              sessionType={sessionType}
              traineeCount={totalTrainees}
              formateurCount={formateurs.length}
              hasExistingGroups={groups.length > 0}
              disabled={isPending}
              onGenerate={generate}
            />
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>Points d&apos;attention</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w) => (
                <li key={`${w.code}-${w.groupId ?? ""}`}>{w.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {groups.length === 0 && totalTrainees > 0 && (
        <p className="text-muted-foreground text-sm">
          Aucun groupe pour l&apos;instant.
          {!readOnly &&
            " Générez-les automatiquement ou ajoutez-les un par un."}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Pour déplacer un apprenant, appuyez sur Espace ou Entrée, utilisez les flèches pour changer de groupe, puis Espace ou Entrée pour déposer, ou Échap pour annuler. Le menu « Déplacer vers » de chaque apprenant offre une alternative.",
          },
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {columnIds.map(renderColumn)}
        </div>
        <DragOverlay>
          {activeTrainee && (
            <div className="bg-card flex min-h-11 items-center gap-2 rounded-md border p-2 shadow-lg">
              <TraineeCardContent trainee={activeTrainee} />
              {selected.has(activeTrainee.inscriptionId) &&
                selected.size > 1 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 text-xs">
                    +{selected.size - 1}
                  </span>
                )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {!readOnly && selected.size > 0 && (
        <div
          role="region"
          aria-label="Actions sur la sélection"
          className="bg-background sticky bottom-4 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border py-1 pr-1 pl-4 shadow-lg"
        >
          <span className="text-sm font-medium" aria-live="polite">
            {selected.size} sélectionné(s)
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="min-h-11 rounded-full" disabled={isPending}>
                Déplacer vers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columnIds.map((id) => (
                <DropdownMenuItem
                  key={id}
                  onSelect={() => move([...selected], id)}
                >
                  {columnLabel(id)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            variant="ghost"
            className="size-11 rounded-full"
            aria-label="Annuler la sélection"
            onClick={() => setSelected(new Set())}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
