import dayjs from "dayjs";

export const UNASSIGNED = "unassigned";

export type Board = Record<string, string[]>;

export function buildBoard(
  groups: { id: string }[],
  inscriptions: { id: string; groupId?: string | null }[]
): Board {
  const board: Board = { [UNASSIGNED]: [] };
  for (const group of groups) board[group.id] = [];
  for (const inscription of inscriptions) {
    const key =
      inscription.groupId && board[inscription.groupId]
        ? inscription.groupId
        : UNASSIGNED;
    board[key].push(inscription.id);
  }
  return board;
}

export function findContainer(board: Board, id: string) {
  if (id in board) return id;
  return Object.keys(board).find((key) => board[key].includes(id));
}

export function moveItems(board: Board, ids: string[], target: string): Board {
  const known = ids.filter((id) => findContainer(board, id) !== undefined);
  const moving = new Set(known);
  const next: Board = {};
  for (const [key, items] of Object.entries(board)) {
    next[key] = items.filter((id) => !moving.has(id));
  }
  next[target] = [...(next[target] ?? []), ...known];
  return next;
}

export function ageFromBirthDate(
  value: Date | string | null | undefined,
  now: Date = new Date()
) {
  if (!value) return null;
  const birth = dayjs(value);
  return birth.isValid() ? dayjs(now).diff(birth, "year") : null;
}

// Clé de remontage : resynchronise l'état local après router.refresh()
export function boardKey(
  groups: { id: string; name: string; formateurId: string | null }[],
  inscriptions: { id: string; groupId?: string | null }[]
) {
  return [
    groups.map((g) => `${g.id}:${g.name}:${g.formateurId ?? ""}`).join(","),
    inscriptions.map((i) => `${i.id}:${i.groupId ?? ""}`).join(","),
  ].join("|");
}
