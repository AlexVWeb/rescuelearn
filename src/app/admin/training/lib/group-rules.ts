import { INSCRIPTION_STATUS, type SessionType } from "../types";

// Ratios apprenants / formateur des référentiels nationaux (RIFP PSC, PSE1, PSE2)
export const GROUP_RULES: Partial<
  Record<SessionType, { maxPerFormateur: number }>
> = {
  PSC: { maxPerFormateur: 10 },
  PSE1: { maxPerFormateur: 12 },
  PSE2: { maxPerFormateur: 12 },
};

export type GroupWarningCode =
  | "over_capacity"
  | "no_formateur"
  | "duplicate_formateur"
  | "not_enough_formateurs"
  | "unassigned";

export interface GroupWarning {
  code: GroupWarningCode;
  message: string;
  groupId?: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  formateurId: string | null;
  traineeCount: number;
}

export function getMaxPerGroup(type: string): number | null {
  return GROUP_RULES[type as SessionType]?.maxPerFormateur ?? null;
}

export function requiredGroupCount(type: string, traineeCount: number) {
  if (traineeCount === 0) return 0;
  const max = getMaxPerGroup(type);
  return max ? Math.ceil(traineeCount / max) : 1;
}

export function defaultGroupCount(
  type: string,
  traineeCount: number,
  formateurCount: number
) {
  return Math.max(1, formateurCount, requiredGroupCount(type, traineeCount));
}

export function groupName(index: number) {
  return index < 26
    ? `Groupe ${String.fromCharCode(65 + index)}`
    : `Groupe ${index + 1}`;
}

export function isCountedInscription(status: string) {
  return status !== INSCRIPTION_STATUS.ELIMINE;
}

export function checkGroups({
  type,
  groups,
  formateurCount,
  unassignedCount,
}: {
  type: string;
  groups: GroupSummary[];
  formateurCount: number;
  unassignedCount: number;
}): GroupWarning[] {
  const warnings: GroupWarning[] = [];
  const max = getMaxPerGroup(type);

  for (const group of groups) {
    if (max && group.traineeCount > max) {
      warnings.push({
        code: "over_capacity",
        groupId: group.id,
        message: `${group.name} : ${group.traineeCount} apprenants pour ${max} maximum par formateur (${type}).`,
      });
    }
    if (!group.formateurId) {
      warnings.push({
        code: "no_formateur",
        groupId: group.id,
        message: `${group.name} n'a pas de formateur référent.`,
      });
    }
  }

  const referents = groups.map((g) => g.formateurId).filter(Boolean);
  if (new Set(referents).size < referents.length) {
    warnings.push({
      code: "duplicate_formateur",
      message: "Un même formateur est référent de plusieurs groupes.",
    });
  }

  const total =
    groups.reduce((sum, g) => sum + g.traineeCount, 0) + unassignedCount;
  const required = requiredGroupCount(type, total);
  if (max && formateurCount < required) {
    warnings.push({
      code: "not_enough_formateurs",
      message: `${total} apprenants en ${type} nécessitent ${required} formateurs (${max} max/formateur), ${formateurCount} affecté(s).`,
    });
  }

  if (groups.length > 0 && unassignedCount > 0) {
    warnings.push({
      code: "unassigned",
      message: `${unassignedCount} apprenant(s) sans groupe.`,
    });
  }

  return warnings;
}

export type GroupStrategy = "random" | "alphabetical" | "mixAges";

export const GROUP_STRATEGY_LABELS: Record<GroupStrategy, string> = {
  random: "Aléatoire",
  alphabetical: "Ordre alphabétique",
  mixAges: "Mélanger les âges",
};

export interface GroupableTrainee {
  inscriptionId: string;
  lastName: string;
  firstName: string;
  age: number | null;
}

export interface GroupDraft {
  name: string;
  formateurId: string | null;
  inscriptionIds: string[];
}

export function balancedSizes(total: number, count: number) {
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function compareNames(a: GroupableTrainee, b: GroupableTrainee) {
  return (
    a.lastName.localeCompare(b.lastName, "fr") ||
    a.firstName.localeCompare(b.firstName, "fr")
  );
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildGroups(
  trainees: GroupableTrainee[],
  formateurIds: string[],
  {
    count,
    strategy,
    random = Math.random,
  }: { count: number; strategy: GroupStrategy; random?: () => number }
): GroupDraft[] {
  const n = Math.max(1, count);
  const groups: GroupDraft[] = Array.from({ length: n }, (_, i) => ({
    name: groupName(i),
    formateurId: formateurIds[i] ?? null,
    inscriptionIds: [],
  }));

  if (strategy === "mixAges") {
    // Serpentin A→Z puis Z→A : chaque groupe reçoit des âges variés
    const byAge = [...trainees].sort(
      (a, b) =>
        (a.age ?? Number.MAX_SAFE_INTEGER) - (b.age ?? Number.MAX_SAFE_INTEGER)
    );
    byAge.forEach((t, i) => {
      const offset = i % n;
      const index = Math.floor(i / n) % 2 === 0 ? offset : n - 1 - offset;
      groups[index].inscriptionIds.push(t.inscriptionId);
    });
    return groups;
  }

  const ordered =
    strategy === "alphabetical"
      ? [...trainees].sort(compareNames)
      : shuffle(trainees, random);
  let cursor = 0;
  balancedSizes(ordered.length, n).forEach((size, i) => {
    groups[i].inscriptionIds = ordered
      .slice(cursor, cursor + size)
      .map((t) => t.inscriptionId);
    cursor += size;
  });
  return groups;
}
