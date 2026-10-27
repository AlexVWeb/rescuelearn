import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "../view-model";

const TONE_CLASS: Record<SessionStatus["tone"], string> = {
  upcoming: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  live: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  done: "bg-muted text-foreground",
};

export function SessionHeading({
  title,
  status,
  datesLabel,
  place,
  showBackLink,
}: {
  title: string;
  status: SessionStatus;
  datesLabel: string;
  place: string;
  showBackLink: boolean;
}) {
  return (
    <div className="space-y-3">
      {showBackLink && (
        <Link
          href="/espace"
          className="text-muted-foreground hover:text-foreground -ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Mes formations
        </Link>
      )}
      <p
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          TONE_CLASS[status.tone]
        )}
      >
        {status.tone === "done" ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <span
            className={cn(
              "size-2 rounded-full",
              status.tone === "live"
                ? "bg-green-600 motion-safe:animate-pulse"
                : "bg-blue-700 dark:bg-blue-300"
            )}
            aria-hidden="true"
          />
        )}
        {status.label}
      </p>
      <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h1>
      <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-sm sm:text-base">
        <li className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          {datesLabel}
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {place}
        </li>
      </ul>
    </div>
  );
}
