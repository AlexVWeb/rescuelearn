import { Navigation } from "lucide-react";

import { getDirectionsLinks } from "@/lib/directions";
import { cn } from "@/lib/utils";

/** Liens d'itinéraire (Google Maps, Plans, Waze) vers une adresse */
export function DirectionsLinks({
  location,
  className,
}: {
  location: string;
  className?: string;
}) {
  const links = getDirectionsLinks(location);
  if (links.length === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
        Itinéraire
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.provider}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener"
              className="hover:bg-accent focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-[3px]"
            >
              {link.label}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
