"use client";

import { useState } from "react";
import { Fingerprint, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { authClient } from "@/lib/auth-client";
import {
  cardClass,
  descriptionClass,
  inputClass,
  primaryButtonClass,
  titleClass,
} from "./styles";

export function PlayerPasskeysCard() {
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    const { error } = await authClient.passkey.addPasskey({
      name: name.trim() || undefined,
    });
    setAdding(false);

    if (!error) {
      setName("");
      toast.success(
        "Passkey ajoutée ! Tu peux te connecter sans mot de passe."
      );
      return;
    }
    const code = "code" in error ? error.code : undefined;
    if (code === "ERROR_CEREMONY_ABORTED") return;
    toast.error(
      code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
        ? "Cet appareil est déjà enregistré."
        : code === "SESSION_NOT_FRESH"
          ? "Par sécurité, reconnecte-toi avant d'ajouter une passkey."
          : "Impossible d'ajouter la passkey. Réessaie."
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) toast.error("Impossible de supprimer la passkey.");
    else toast.success("Passkey supprimée.");
  };

  return (
    <section className={cardClass} aria-labelledby="player-passkeys-title">
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-emerald-50/60 blur-xl" />

      <h2 id="player-passkeys-title" className={titleClass}>
        <Fingerprint className="h-4 w-4 text-emerald-500" />
        Passkeys
      </h2>
      <p className={descriptionClass}>
        Connecte-toi en un geste avec Face ID, Touch ID, Windows Hello ou ton
        gestionnaire de mots de passe.
      </p>

      <div className="mt-5 space-y-2">
        {isPending ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-100 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-800">
                    {pk.name || "Passkey"}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    Ajoutée le{" "}
                    {new Date(pk.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Supprimer la passkey"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Supprimer cette passkey ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tu ne pourras plus te connecter avec cet appareil sans
                      l&apos;enregistrer à nouveau.
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
            </div>
          ))
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-slate-100 p-4 text-center text-xs font-bold text-slate-400">
            Aucune passkey enregistrée.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          placeholder="Nom de l'appareil (optionnel)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className={`${primaryButtonClass} shrink-0`}
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Ajouter
        </button>
      </div>
    </section>
  );
}
