"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { GraduationCap, UserPen } from "lucide-react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setSessionFormateurs } from "@/app/admin/training/actions/sessions";
import type { SessionFormateurUser } from "@/app/admin/training/types";

interface SessionFormateursProps {
  sessionId: string;
  sessionStatus: string;
  assigned: SessionFormateurUser[];
  assignable: SessionFormateurUser[];
}

function displayName(user: SessionFormateurUser) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

export function SessionFormateurs({
  sessionId,
  sessionStatus,
  assigned,
  assignable,
}: SessionFormateursProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState(() =>
    assigned.map((u) => u.id)
  );

  const isClosed = sessionStatus === "terminée" || sessionStatus === "annulée";
  const usersById = new Map([...assignable, ...assigned].map((u) => [u.id, u]));

  function save(nextIds: string[]) {
    if (nextIds.length === 0) {
      toast.error("Au moins un formateur doit être affecté");
      return;
    }
    const previousIds = selectedIds;
    setSelectedIds(nextIds);
    startTransition(async () => {
      try {
        await setSessionFormateurs(sessionId, nextIds);
        router.refresh();
      } catch (e) {
        logger.error(e);
        setSelectedIds(previousIds);
        toast.error(
          e instanceof Error
            ? e.message
            : "Erreur lors de la mise à jour des formateurs"
        );
      }
    });
  }

  function toggle(userId: string, checked: boolean) {
    save(
      checked
        ? [...selectedIds, userId]
        : selectedIds.filter((id) => id !== userId)
    );
  }

  const assignedCount = selectedIds.length;
  const hasOtherMembers = assignable.some((u) => !selectedIds.includes(u.id));
  const names = selectedIds
    .map((id) => usersById.get(id))
    .filter((u): u is SessionFormateurUser => !!u)
    .map(displayName);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex items-center gap-1">
        <GraduationCap className="h-4 w-4" aria-hidden />
        <span className="sr-only">Formateurs :</span>
        <span className="text-foreground">{names.join(", ")}</span>
      </span>
      {!isClosed && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="h-7 px-2"
              aria-label="Gérer les formateurs de la session"
            >
              <UserPen className="h-4 w-4" />
              <span className="hidden sm:inline">Gérer</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 w-72">
            <DropdownMenuLabel>Formateurs de la session</DropdownMenuLabel>
            <p className="text-muted-foreground px-2 pb-1.5 text-xs">
              Leurs noms figurent sur les attestations, FISE, PV et fiches
              d&apos;évaluation.
            </p>
            <DropdownMenuSeparator />
            {assignable.map((user) => (
              <DropdownMenuCheckboxItem
                key={user.id}
                checked={selectedIds.includes(user.id)}
                onCheckedChange={(checked) => toggle(user.id, checked)}
                onSelect={(e) => e.preventDefault()}
                disabled={
                  isPending ||
                  (assignedCount === 1 && selectedIds.includes(user.id))
                }
              >
                {displayName(user)}
              </DropdownMenuCheckboxItem>
            ))}
            {!hasOtherMembers && (
              <>
                <DropdownMenuSeparator />
                <p className="text-muted-foreground px-2 py-1.5 text-xs">
                  Aucun autre membre dans votre organisme.{" "}
                  <Link
                    href="/admin/training/dashboard"
                    className="text-primary underline"
                  >
                    Inviter un formateur
                  </Link>
                </p>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
