"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { GraduationCap, UserPlus, X } from "lucide-react";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
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

interface FormateursCardProps {
  sessionId: string;
  sessionStatus: string;
  assigned: SessionFormateurUser[];
  assignable: SessionFormateurUser[];
}

function displayName(user: SessionFormateurUser) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

export function FormateursCard({
  sessionId,
  sessionStatus,
  assigned,
  assignable,
}: FormateursCardProps) {
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

  return (
    <section
      aria-labelledby="session-formateurs-title"
      className="border-primary/20 bg-primary/5 rounded-xl border p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="session-formateurs-title"
              className="text-base font-semibold"
            >
              Formateurs de la session
            </h2>
            <p className="text-muted-foreground text-sm">
              Leurs noms figurent sur les attestations, FISE, PV et fiches
              d&apos;évaluation.
            </p>
          </div>
        </div>

        {!isClosed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={isPending} className="shrink-0">
                <UserPlus className="mr-1 h-4 w-4" />
                Ajouter un formateur
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-72">
              <DropdownMenuLabel>Membres de l&apos;organisme</DropdownMenuLabel>
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

      <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-12">
        {selectedIds.map((id) => {
          const user = usersById.get(id);
          if (!user) return null;
          return (
            <Badge
              key={id}
              variant="outline"
              className="bg-background gap-1 py-1 text-sm"
            >
              {displayName(user)}
              {!isClosed && assignedCount > 1 && (
                <button
                  type="button"
                  onClick={() => toggle(id, false)}
                  disabled={isPending}
                  aria-label={`Retirer ${displayName(user)}`}
                  className="hover:text-destructive ml-1 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}
        {isClosed ? (
          <span className="text-muted-foreground text-xs">
            Session clôturée : la liste n&apos;est plus modifiable.
          </span>
        ) : (
          assignedCount === 1 &&
          hasOtherMembers && (
            <span className="text-muted-foreground text-xs">
              Plusieurs formateurs animent la session ? Ajoutez-les pour
              qu&apos;ils apparaissent sur les documents.
            </span>
          )
        )}
      </div>
    </section>
  );
}
