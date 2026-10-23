"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { redeemAccessToken, type RedeemResult } from "../actions";

const DENIAL_PARAM: Record<
  Exclude<RedeemResult, { ok: true }>["reason"],
  string
> = {
  invalid: "invalide",
  revoked: "revoque",
  anonymized: "invalide",
  expired: "expire",
  rate_limited: "trop-de-tentatives",
};

export function AccessRedeemer() {
  const router = useRouter();
  // StrictMode exécute les effets deux fois en dev
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
    // Le token ne doit rester ni dans la barre d'adresse ni dans l'historique
    window.history.replaceState(null, "", window.location.pathname);

    // Lien tronqué, ou retour arrière : un cookie encore valide suffit
    if (!token) {
      router.replace("/espace");
      return;
    }

    redeemAccessToken(token)
      .then((result) => {
        router.replace(
          result.ok
            ? "/espace"
            : `/espace/lien-invalide?raison=${DENIAL_PARAM[result.reason]}`
        );
      })
      .catch(() => router.replace("/espace/lien-invalide"));
  }, [router]);

  return (
    <Card className="flex w-full max-w-md flex-col items-center gap-4 p-12">
      <RefreshCw
        className="text-primary h-8 w-8 motion-safe:animate-spin"
        aria-hidden="true"
      />
      <p role="status" className="text-muted-foreground text-sm">
        Ouverture de votre espace de formation…
      </p>
    </Card>
  );
}
