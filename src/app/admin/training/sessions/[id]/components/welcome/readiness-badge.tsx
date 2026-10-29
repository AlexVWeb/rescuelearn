"use client";

import dayjs from "dayjs";
import "dayjs/locale/fr";
import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SessionReadiness } from "@/app/admin/training/actions";

export function ReadinessBadge({
  readiness,
  traineeName,
}: {
  readiness: SessionReadiness;
  traineeName: string;
}) {
  const complete = readiness.done === readiness.total;

  return (
    <Popover>
      <PopoverTrigger
        className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-[3px]"
        aria-label={`Préparation de ${traineeName} : ${readiness.done} sur ${readiness.total}`}
      >
        <Badge
          variant={complete ? "success" : "outline"}
          className="tabular-nums"
        >
          {readiness.done}/{readiness.total}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-medium">Préparation de la venue</p>
        <ul className="space-y-1.5 text-sm">
          {readiness.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              {item.done ? (
                <Check
                  className="text-success mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span className={item.done ? undefined : "text-muted-foreground"}>
                <span className="sr-only">
                  {item.done ? "Fait : " : "À faire : "}
                </span>
                {item.label}
                {item.kind === "terms" && readiness.termsAcceptedAt && (
                  <span className="text-muted-foreground block text-xs">
                    Acceptées le{" "}
                    {dayjs(readiness.termsAcceptedAt)
                      .locale("fr")
                      .format("D MMM YYYY [à] H[h]mm")}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
