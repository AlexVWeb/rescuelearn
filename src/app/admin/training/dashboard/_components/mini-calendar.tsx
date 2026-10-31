"use client";

import { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

dayjs.locale("fr");

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface CalendarEvent {
  /** « 2026-11-03 » */
  date: string;
  title: string;
  sessionId: string;
}

/** Grille du mois, semaines du lundi au dimanche */
function monthGrid(month: dayjs.Dayjs) {
  const start = month.startOf("month");
  const leading = (start.day() + 6) % 7;
  const cells = Math.ceil((leading + month.daysInMonth()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => start.add(i - leading, "day"));
}

export function MiniCalendar({
  calendarEvents,
}: {
  calendarEvents: CalendarEvent[];
}) {
  const [currentMonth, setCurrentMonth] = useState(() => dayjs());

  const grid = monthGrid(currentMonth);
  const todayKey = dayjs().format("YYYY-MM-DD");
  const byDay = new Map<string, Map<string, string>>();
  for (const event of calendarEvents) {
    const sessions = byDay.get(event.date) ?? new Map<string, string>();
    sessions.set(event.sessionId, event.title);
    byDay.set(event.date, sessions);
  }

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize" aria-live="polite">
          {currentMonth.format("MMMM YYYY")}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
            className="hover:bg-muted focus-visible:ring-ring rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
            className="hover:bg-muted focus-visible:ring-ring rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="text-muted-foreground mb-1 grid grid-cols-7 text-center text-xs"
        aria-hidden="true"
      >
        {WEEKDAYS.map((day, idx) => (
          <span key={idx}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {grid.map((date, index) => {
          const key = date.format("YYYY-MM-DD");
          const sessions = byDay.get(key);
          const inMonth = date.month() === currentMonth.month();
          const isToday = key === todayKey;
          const dayClass = cn(
            "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full tabular-nums",
            !inMonth && "opacity-40",
            isToday &&
              (sessions
                ? "bg-brand text-brand-foreground font-semibold"
                : "ring-foreground/50 font-semibold ring-1")
          );

          if (!sessions) {
            return (
              <span key={key} className="flex h-8 items-center">
                <span className={dayClass}>{date.date()}</span>
              </span>
            );
          }

          // Jours de session consécutifs sur une même semaine : une seule bande
          const column = index % 7;
          const joinsPrev =
            column > 0 && byDay.has(grid[index - 1].format("YYYY-MM-DD"));
          const joinsNext =
            column < 6 && byDay.has(grid[index + 1].format("YYYY-MM-DD"));
          const titles = Array.from(sessions.values());
          const ids = Array.from(sessions.keys());
          // Une session : on l'ouvre ; plusieurs : la liste
          const href =
            ids.length === 1
              ? `/admin/training/sessions/${ids[0]}`
              : "/admin/training/sessions";

          return (
            <span
              key={key}
              className="group/day relative flex h-8 items-center"
            >
              <span
                className={cn(
                  "bg-brand/15 dark:bg-brand/70 absolute inset-y-0 right-0 left-0",
                  !joinsPrev && "left-1 rounded-l-full",
                  !joinsNext && "right-1 rounded-r-full",
                  !inMonth && "opacity-40"
                )}
                aria-hidden="true"
              />
              <Link
                href={href}
                className={cn(
                  dayClass,
                  !isToday &&
                    "text-brand dark:text-brand-foreground hover:bg-brand/20 font-semibold",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                )}
                aria-label={`${date.format("D MMMM")} : ${titles.join(", ")}`}
              >
                {date.date()}
              </Link>
              <span
                className="bg-foreground text-background pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-48 -translate-x-1/2 rounded-md px-2 py-1 text-left text-xs leading-snug group-focus-within/day:block group-hover/day:block"
                aria-hidden="true"
              >
                {titles.join(", ")}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
