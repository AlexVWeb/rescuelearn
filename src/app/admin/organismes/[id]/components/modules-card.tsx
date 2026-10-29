"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { OrganismeModuleState } from "@/lib/organisme-modules/resolve";
import {
  setModuleAvailabilityAction,
  setModuleEnabledAction,
} from "@/app/actions/organisme-modules.actions";

interface ModulesCardProps {
  organismeId: string;
  modules: OrganismeModuleState[];
  /** Super admin : gère la disponibilité et voit les modules indisponibles */
  canManageAvailability: boolean;
}

type Patch = { key: string; field: "available" | "enabled"; value: boolean };

export function ModulesCard({
  organismeId,
  modules,
  canManageAvailability,
}: ModulesCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, applyPatch] = useOptimistic(
    modules,
    (state, { key, field, value }: Patch) =>
      state.map((m) => (m.key === key ? { ...m, [field]: value } : m))
  );

  const visible = canManageAvailability
    ? optimistic
    : optimistic.filter((m) => m.available);

  function update(patch: Patch) {
    startTransition(async () => {
      applyPatch(patch);
      const result =
        patch.field === "available"
          ? await setModuleAvailabilityAction(
              organismeId,
              patch.key,
              patch.value
            )
          : await setModuleEnabledAction(patch.key, patch.value, organismeId);
      if (result.success) {
        toast.success("Module mis à jour");
        router.refresh();
      } else {
        // useOptimistic revient seul à l'état serveur en fin de transition
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
        <CardDescription>
          Fonctionnalités activables pour cet organisme.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {visible.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Aucun module disponible.
          </p>
        )}
        {visible.map((m) => (
          <div
            key={m.key}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">{m.label}</p>
              <p className="text-muted-foreground text-sm">{m.description}</p>
              {m.available && !m.enabled && (
                <p className="text-muted-foreground text-xs">
                  {m.disabledHint}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-6">
              {canManageAvailability && (
                <div className="flex items-center gap-2">
                  <Switch
                    id={`${m.key}-available`}
                    checked={m.available}
                    disabled={pending}
                    onCheckedChange={(value) =>
                      update({ key: m.key, field: "available", value })
                    }
                  />
                  <Label htmlFor={`${m.key}-available`}>Disponible</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  id={`${m.key}-enabled`}
                  checked={m.enabled}
                  disabled={pending || !m.available}
                  onCheckedChange={(value) =>
                    update({ key: m.key, field: "enabled", value })
                  }
                />
                <Label htmlFor={`${m.key}-enabled`}>Activé</Label>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
