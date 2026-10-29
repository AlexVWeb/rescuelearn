"use client";

import {
  CalendarDays,
  Lock,
  MapPin,
  Pencil,
  UserStar,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDirectionsLinks } from "@/lib/directions";
import { SessionStatusBadge } from "./session-status-badge";
import { SessionFormateurs } from "../[id]/components/session-formateurs";
import { formatFormateurName } from "@/app/admin/training/lib/formateurs";
import {
  SESSION_STATUS,
  type SessionFormateurUser,
  type TrainingSession,
} from "@/app/admin/training/types";

// Fuseau fixe : rendu identique côté serveur et client (pas d'écart d'hydratation)
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Paris",
});

function formatPeriod(start: Date | null, end: Date | null) {
  if (!start) return null;
  const from = dateFormat.format(new Date(start));
  if (!end) return from;
  const to = dateFormat.format(new Date(end));
  return from === to ? from : `${from} → ${to}`;
}

interface SessionHeaderProps {
  session: TrainingSession;
  inscriptionCount: number;
  assignedFormateurs: SessionFormateurUser[];
  assignableFormateurs: SessionFormateurUser[];
  onEdit: () => void;
}

export function SessionHeader({
  session,
  inscriptionCount,
  assignedFormateurs,
  assignableFormateurs,
  onEdit,
}: SessionHeaderProps) {
  const period = formatPeriod(session.startDate, session.endDate);
  const isCancelled = session.status === SESSION_STATUS.ANNULEE;
  const isClosed = isCancelled || session.status === SESSION_STATUS.TERMINEE;

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
              {session.title}
            </h1>
            <SessionStatusBadge status={session.status} />
          </div>
        </div>
        <Button variant="outline" onClick={onEdit} className="shrink-0">
          <Pencil className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Modifier</span>
        </Button>
      </div>

      <ul
        aria-label="Informations de la session"
        className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
      >
        <li>
          <Badge variant="outline">{session.type}</Badge>
        </li>
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-1 rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">Lieu :</span>
              {session.location}
              <span className="sr-only">, itinéraire</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Itinéraire</DropdownMenuLabel>
              {getDirectionsLinks(session.location).map((link) => (
                <DropdownMenuItem key={link.provider} asChild>
                  <a href={link.url} target="_blank" rel="noopener">
                    {link.label}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        {period && (
          <li className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span className="sr-only">Dates :</span>
            {period}
          </li>
        )}
        <li className="flex items-center gap-1">
          <Users className="h-4 w-4" aria-hidden />
          {inscriptionCount}/{session.maxTrainees} inscrits
        </li>
        <li>
          <SessionFormateurs
            key={assignedFormateurs.map((u) => u.id).join(",")}
            sessionId={session.id}
            sessionStatus={session.status}
            assigned={assignedFormateurs}
            assignable={assignableFormateurs}
          />
        </li>
        {session.responsablePedagogique && (
          <li className="flex items-center gap-1">
            <UserStar className="h-4 w-4" aria-hidden />
            <span>
              Responsable pédagogique :{" "}
              <span className="text-foreground">
                {formatFormateurName(session.responsablePedagogique) ||
                  session.responsablePedagogique.email}
              </span>
            </span>
          </li>
        )}
      </ul>

      {isClosed && (
        <p
          role="note"
          className="bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          {isCancelled ? "Session annulée" : "Session terminée"} : consultation
          seule. Changez son statut via Modifier pour la rouvrir.
        </p>
      )}
    </header>
  );
}
