"use server";

import { prisma } from "@/lib/prisma";
import { requireOrganisme } from "./_context";
import {
  SESSION_STATUS,
  ATTESTATION_RESULT,
  EMARGEMENT_STATUS,
} from "../types";
import dayjs from "dayjs";

export async function getDashboardStats() {
  const user = await requireOrganisme();
  const now = dayjs();
  const monthStart = now.startOf("month").toDate();
  const monthEnd = now.endOf("month").toDate();
  const last30Days = now.subtract(30, "day").toDate();

  // 1. Upcoming Sessions
  const upcomingSessions = await prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      status: { in: [SESSION_STATUS.PLANIFIEE, SESSION_STATUS.EN_COURS] },
    },
    select: {
      id: true,
      startDate: true,
    },
  });

  const totalUpcoming = upcomingSessions.length;
  const upcomingThisMonth = upcomingSessions.filter(
    (s) => s.startDate && s.startDate >= monthStart && s.startDate <= monthEnd
  ).length;

  // Real data for the small bar chart (last 6 months)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = now.subtract(5 - i, "month");
    return {
      month: d.month(),
      year: d.year(),
      name: d.format("MMM"),
      total: 0,
    };
  });

  const allSessionsForChart = await prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      startDate: {
        gte: now.subtract(6, "month").startOf("month").toDate(),
      },
    },
    select: { startDate: true },
  });

  allSessionsForChart.forEach((s) => {
    if (!s.startDate) return;
    const sDate = dayjs(s.startDate);
    const monthData = last6Months.find(
      (m) => m.month === sDate.month() && m.year === sDate.year()
    );
    if (monthData) monthData.total++;
  });

  const sessionChartData = last6Months.map(({ name, total }) => ({
    name,
    total,
  }));

  // 2. Trainees Formed
  const completedSessions = await prisma.trainingSession.findMany({
    where: {
      organismeId: user.organismeId,
      status: SESSION_STATUS.TERMINEE,
    },
    include: {
      inscriptions: true,
    },
  });

  let totalTraineesFormed = 0;
  let formedThisMonth = 0;

  completedSessions.forEach((session) => {
    const presentInscriptions = session.inscriptions.filter(
      (i) => i.status === "présent"
    ).length;
    totalTraineesFormed += presentInscriptions;

    if (session.endDate && dayjs(session.endDate).isAfter(monthStart)) {
      formedThisMonth += presentInscriptions;
    }
  });

  // 3. Success Rate
  let totalInscriptionsForSuccess = 0;
  let totalAcquis = 0;

  completedSessions.forEach((session) => {
    session.inscriptions.forEach((i) => {
      totalInscriptionsForSuccess++;
      if (i.attestationResult === ATTESTATION_RESULT.ACQUIS) {
        totalAcquis++;
      }
    });
  });

  const successRate =
    totalInscriptionsForSuccess > 0
      ? Math.round((totalAcquis / totalInscriptionsForSuccess) * 100)
      : 0;

  // 4. Presence Rate (last 30 days)
  const emargements = await prisma.emargement.findMany({
    where: {
      inscription: {
        trainingSession: {
          organismeId: user.organismeId,
        },
      },
      slot: {
        date: {
          gte: last30Days,
        },
      },
    },
    select: {
      status: true,
    },
  });

  const totalEmargements = emargements.length;
  const validatedEmargements = emargements.filter(
    (e) => e.status === EMARGEMENT_STATUS.VALIDE
  ).length;

  const presenceRate =
    totalEmargements > 0
      ? Math.round((validatedEmargements / totalEmargements) * 100)
      : 100; // Default to 100 if no data

  return {
    sessions: {
      total: totalUpcoming,
      increase: upcomingThisMonth,
      chartData: sessionChartData,
    },
    trainees: {
      total: totalTraineesFormed,
      increase: formedThisMonth,
    },
    successRate: {
      percentage: successRate,
      year: now.year(),
    },
    presence: {
      percentage: presenceRate,
      days: 30,
    },
  };
}
