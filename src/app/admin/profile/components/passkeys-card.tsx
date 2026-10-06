"use client";

import { useState } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function PasskeysCard() {
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setAdding(true);
    setError("");

    const { error } = await authClient.passkey.addPasskey({
      name: name.trim() || undefined,
    });
    setAdding(false);

    if (!error) {
      setName("");
      return;
    }
    const code = "code" in error ? error.code : undefined;
    if (code === "ERROR_CEREMONY_ABORTED") return;
    setError(
      code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
        ? "Cet appareil est déjà enregistré."
        : code === "SESSION_NOT_FRESH"
          ? "Par sécurité, reconnectez-vous avant d'ajouter une passkey."
          : "Impossible d'ajouter la passkey. Réessayez."
    );
  };

  const handleDelete = async (id: string) => {
    setError("");
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) setError("Impossible de supprimer la passkey.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Connectez-vous sans mot de passe avec Face ID, Touch ID, Windows Hello
          ou une clé de sécurité.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        ) : passkeys && passkeys.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <KeyRound className="text-muted-foreground h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {pk.name || "Passkey"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Ajoutée le{" "}
                      {new Date(pk.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer la passkey"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Supprimer cette passkey ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous ne pourrez plus vous connecter avec cet appareil
                        sans la réenregistrer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(pk.id)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune passkey enregistrée.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nom de l'appareil (optionnel)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Ajouter
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  );
}
