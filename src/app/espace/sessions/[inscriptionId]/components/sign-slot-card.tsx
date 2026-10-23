"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signEmargementFromPortal, type SignResult } from "../../../actions";
import type { SlotView } from "../types";

interface SignSlotCardProps {
  inscriptionId: string;
  slot: SlotView;
}

export function SignSlotCard({ inscriptionId, slot }: SignSlotCardProps) {
  const [result, formAction, pending] = useActionState(
    async (_previous: SignResult | null, formData: FormData) =>
      signEmargementFromPortal(
        inscriptionId,
        slot.id,
        String(formData.get("pin") ?? "").trim()
      ),
    null
  );
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  const error = result && !result.ok ? result.error : null;
  // result.ok couvre aussi le cas idempotent, où la page n'est pas revalidée
  const signed = slot.state === "signed" || result?.ok === true;

  // Erreur : retour au champ (React vide le formulaire après l'action).
  // Succès : le formulaire disparaît, le focus suit le message de confirmation.
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error, result]);
  useEffect(() => {
    if (signed && result?.ok) successRef.current?.focus();
  }, [signed, result]);

  return (
    <section
      aria-labelledby="action-title"
      className="bg-card rounded-xl border p-5 shadow-sm"
    >
      <h2
        id="action-title"
        className="text-muted-foreground text-sm font-medium"
      >
        {signed ? "Créneau en cours" : "À faire maintenant"}
      </h2>
      <p className="mt-1 text-lg font-semibold">Émarger · {slot.label}</p>
      <p className="text-muted-foreground text-sm">
        {slot.dayLabel} · {slot.timeRange}
      </p>

      {/* Région live toujours présente : l'annonce survit au changement de contenu */}
      <div aria-live="polite" className="mt-4">
        {signed ? (
          <p
            ref={successRef}
            tabIndex={-1}
            className="flex items-center gap-2 font-medium outline-none"
          >
            <CheckCircle2
              className="text-success h-6 w-6 shrink-0"
              aria-hidden="true"
            />
            Présence enregistrée
            {slot.signedAtLabel ? ` à ${slot.signedAtLabel}` : ""}
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>Code affiché en salle</Label>
              <Input
                ref={inputRef}
                id={inputId}
                name="pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                disabled={pending}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : hintId}
                className="h-14 text-center font-mono text-2xl tracking-[0.4em]"
              />
              {error ? (
                <p id={errorId} className="text-destructive text-sm">
                  {error}
                </p>
              ) : (
                <p id={hintId} className="text-muted-foreground text-sm">
                  6 chiffres, affichés par votre formateur.
                </p>
              )}
            </div>
            <Button type="submit" className="h-12 w-full" disabled={pending}>
              {pending ? (
                <>
                  <RefreshCw
                    className="h-4 w-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  Enregistrement…
                </>
              ) : (
                "Je confirme ma présence"
              )}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
