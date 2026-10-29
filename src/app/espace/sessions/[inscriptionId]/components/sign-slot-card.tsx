"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signEmargementFromPortal, type SignResult } from "../../../actions";
import type { SlotView } from "../types";
import { ACTION_BUTTON_CLASS, ActionShell } from "./action-shell";

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
    <ActionShell
      eyebrow={signed ? "Créneau en cours" : "À faire maintenant"}
      title={`Émarger · ${slot.label}`}
      description={`${slot.dayLabel} · ${slot.timeRange}`}
    >
      {/* Région live toujours présente : l'annonce survit au changement de contenu */}
      <div aria-live="polite">
        {signed ? (
          <p
            ref={successRef}
            tabIndex={-1}
            className="bg-brand-foreground/10 flex items-center gap-3 rounded-xl p-4 font-medium outline-none"
          >
            <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
            Présence enregistrée
            {slot.signedAtLabel ? ` à ${slot.signedAtLabel}` : ""}
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={inputId}>Code affiché en salle</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
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
                  className="bg-background text-foreground h-14 flex-1 rounded-xl border-0 text-center font-mono text-2xl tracking-[0.4em]"
                />
                <Button
                  type="submit"
                  className={`${ACTION_BUTTON_CLASS} sm:h-14`}
                  disabled={pending}
                >
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
              </div>
              {error ? (
                // Fond clair : le rouge reste lisible sur la carte inversée
                <p
                  id={errorId}
                  className="bg-background text-destructive rounded-lg px-3 py-2 text-sm font-medium"
                >
                  {error}
                </p>
              ) : (
                <p id={hintId} className="text-brand-foreground/85 text-sm">
                  6 chiffres, affichés par votre formateur.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </ActionShell>
  );
}
