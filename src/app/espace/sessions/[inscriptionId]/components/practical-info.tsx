import { MapPin } from "lucide-react";
import { DirectionsLinks } from "@/components/directions-links";
import type { PracticalInfoView } from "../types";
import { summarizeSchedule } from "../view-model";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 p-4">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Avant la session : tout pour venir (lieu, horaires, à apporter).
 * Pendant : le lieu et l'itinéraire seulement, le planning dit le reste.
 */
export function PracticalInfo({
  info,
  compact = false,
}: {
  info: PracticalInfoView;
  compact?: boolean;
}) {
  const schedule = summarizeSchedule(info.days);

  return (
    <section aria-labelledby="practical-title" className="space-y-3">
      <h2 id="practical-title" className="text-lg font-semibold">
        {compact ? "Lieu" : "Le jour J"}
      </h2>
      <div className="bg-card divide-y rounded-xl border text-sm">
        <Block title={compact ? "Adresse" : "Lieu"}>
          <p className="flex items-start gap-2 text-base font-medium">
            <MapPin
              className="text-muted-foreground mt-1 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {info.location}
          </p>
          {info.accessInfo && (
            <p className="text-muted-foreground whitespace-pre-line">
              {info.accessInfo}
            </p>
          )}
          <DirectionsLinks location={info.location} className="pt-2" />
        </Block>

        {!compact && schedule.length > 0 && (
          <Block title="Horaires">
            <ul className="space-y-1">
              {schedule.map((day) => (
                <li key={day.dayLabel}>
                  <span className="font-medium first-letter:uppercase">
                    {day.dayLabel}
                  </span>
                  <span className="text-muted-foreground block">
                    {day.ranges.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {!compact && info.toBring.length > 0 && (
          <Block title="À apporter">
            <ul className="list-disc space-y-0.5 pl-5">
              {info.toBring.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </section>
  );
}
