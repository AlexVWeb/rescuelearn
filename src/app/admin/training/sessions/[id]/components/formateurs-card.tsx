"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formateurs</CardTitle>
        <CardDescription>
          Formateurs affectés à la session, repris sur les documents
          (attestations, FISE, fiches d&apos;évaluation).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => {
          const user = usersById.get(id);
          if (!user) return null;
          return (
            <Badge key={id} variant="secondary" className="gap-1 py-1">
              {displayName(user)}
              {!isClosed && selectedIds.length > 1 && (
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

        {!isClosed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                <Plus className="mr-1 h-4 w-4" />
                Gérer
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-64">
              {assignable.map((user) => (
                <DropdownMenuCheckboxItem
                  key={user.id}
                  checked={selectedIds.includes(user.id)}
                  onCheckedChange={(checked) => toggle(user.id, checked)}
                  onSelect={(e) => e.preventDefault()}
                  disabled={isPending}
                >
                  {displayName(user)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardContent>
    </Card>
  );
}
