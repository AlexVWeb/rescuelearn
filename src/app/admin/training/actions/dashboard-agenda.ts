"use server";

import { getTenantPrisma } from "@/lib/context";
import { SESSION_STATUS } from "../types";
import {
  buildTodos,
  dayRange,
  buildWeekAgenda,
  LOW_FILL_HORIZON_DAYS,
  parisDayKey,
  type WeekAgenda,
  type DashboardTodo,
} from "../lib/dashboard-agenda";

const ACTIVE_STATUSES = [SESSION_STATUS.PLANIFIEE, SESSION_STATUS.EN_COURS];

export interface DashboardAgenda {
  todayKey: string;
  week: WeekAgenda;
  todos: DashboardTodo[];
}

/** Les 7 prochains jours et les actions en attente de l'organisme. */
export async function getDashboardAgenda(): Promise<DashboardAgenda> {
  const tenant = await getTenantPrisma();
  const now = new Date();
  const todayKey = parisDayKey(now);
  const weekRange = dayRange(now);
  const fillHorizon = dayRange(now, LOW_FILL_HORIZON_DAYS);

  const [slots, overdue, startingSoon] = await Promise.all([
    tenant.slot.findMany({
      where: {
        date: { gte: weekRange.start, lt: weekRange.end },
        trainingSession: { status: { in: ACTIVE_STATUSES } },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
        trainingSession: {
          select: {
            id: true,
            title: true,
            type: true,
            location: true,
            maxTrainees: true,
            _count: { select: { inscriptions: true } },
          },
        },
      },
    }),
    // Dernier jour passé mais session pas encore clôturée
    tenant.trainingSession.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        endDate: { lt: weekRange.start },
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        _count: {
          select: { inscriptions: { where: { attestationResult: null } } },
        },
      },
      orderBy: { endDate: "asc" },
    }),
    tenant.trainingSession.findMany({
      where: {
        status: SESSION_STATUS.PLANIFIEE,
        startDate: { gte: fillHorizon.start, lt: fillHorizon.end },
      },
      select: {
        id: true,
        title: true,
        startDate: true,
        maxTrainees: true,
        _count: { select: { inscriptions: true } },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const week = buildWeekAgenda(
    slots.map(({ trainingSession, ...slot }) => ({
      ...slot,
      session: {
        id: trainingSession.id,
        title: trainingSession.title,
        type: trainingSession.type,
        location: trainingSession.location,
        maxTrainees: trainingSession.maxTrainees,
        enrolled: trainingSession._count.inscriptions,
      },
    })),
    todayKey
  );

  const todos = buildTodos(
    overdue.flatMap((session) =>
      session.endDate
        ? [
            {
              id: session.id,
              title: session.title,
              endDate: session.endDate,
              missingResults: session._count.inscriptions,
            },
          ]
        : []
    ),
    startingSoon.flatMap((session) =>
      session.startDate
        ? [
            {
              id: session.id,
              title: session.title,
              startDate: session.startDate,
              enrolled: session._count.inscriptions,
              maxTrainees: session.maxTrainees,
            },
          ]
        : []
    )
  );

  return { todayKey, week, todos };
}
