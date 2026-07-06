"use client";

import React, { useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { ChevronLeft, ChevronRight } from "lucide-react";

dayjs.locale("fr");

export function MiniCalendar({
  calendarEvents,
}: {
  calendarEvents: { date: string; title: string }[];
}) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");

  const startDayOfWeek = startOfMonth.day() === 0 ? 7 : startOfMonth.day();

  const daysInMonth = currentMonth.daysInMonth();

  const prevMonthDays = Array.from({ length: startDayOfWeek - 1 }, (_, i) => {
    return startOfMonth.subtract(startDayOfWeek - 1 - i, "day");
  });

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return startOfMonth.add(i, "day");
  });

  const totalDays = [...prevMonthDays, ...currentMonthDays];
  while (totalDays.length % 7 !== 0) {
    const nextOffset =
      totalDays.length - prevMonthDays.length - daysInMonth + 1;
    totalDays.push(endOfMonth.add(nextOffset, "day"));
  }

  const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold capitalize">
          {currentMonth.format("MMMM YYYY")}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
            className="hover:bg-muted cursor-pointer rounded p-1 transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
            className="hover:bg-muted cursor-pointer rounded p-1 transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="text-muted-foreground mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold">
        {weekdays.map((w, idx) => (
          <div key={idx} aria-hidden="true">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {totalDays.map((date, idx) => {
          const isCurrentMonth = date.month() === currentMonth.month();
          const dateStr = date.format("YYYY-MM-DD");
          const matchingEvents = calendarEvents.filter(
            (e) => e.date === dateStr
          );
          const hasSession = matchingEvents.length > 0;
          const tooltipText = Array.from(
            new Set(matchingEvents.map((e) => e.title))
          ).join(", ");
          const isToday = date.isSame(dayjs(), "day");

          return (
            <div
              key={idx}
              className="group/tooltip relative flex aspect-square items-center justify-center"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-medium transition-all ${!isCurrentMonth ? "text-muted-foreground/20" : ""} ${isToday ? "border-primary text-primary border" : ""} ${hasSession ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:bg-muted/50 cursor-pointer"} `}
                aria-label={
                  date.format("D MMMM YYYY") +
                  (hasSession ? ` - Session : ${tooltipText}` : "")
                }
              >
                {date.date()}
              </div>

              {/* Instant Modern Tooltip */}
              {hasSession && (
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 flex-col items-center group-hover/tooltip:flex"
                  role="tooltip"
                >
                  <div className="rounded-md bg-slate-950 px-2.5 py-1.5 text-[10px] leading-none font-bold whitespace-nowrap text-white shadow-lg transition-opacity">
                    {tooltipText}
                  </div>
                  <div className="-mt-[3px] h-1.5 w-1.5 rotate-45 bg-slate-950" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
