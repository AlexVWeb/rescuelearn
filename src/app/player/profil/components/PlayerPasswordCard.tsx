"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  updatePasswordAction,
  requestPasswordResetFromProfileAction,
} from "@/app/actions/profile-actions";
import { PasswordStrengthIndicator } from "@/app/admin/profile/components/password-strength-indicator";
import {
  cardClass,
  descriptionClass,
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  titleClass,
} from "./styles";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requis"),
    newPassword: z.string().min(8, "Au moins 8 caractères"),
    confirmPassword: z.string().min(1, "Requis"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const FIELDS = [
  {
    name: "currentPassword",
    label: "Mot de passe actuel",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "Nouveau mot de passe",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirmer le nouveau mot de passe",
    autoComplete: "new-password",
  },
] as const;

export function PlayerPasswordCard({ email }: { email: string }) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const { errors, isSubmitting } = form.formState;
  const newPassword = useWatch({ control: form.control, name: "newPassword" });

  const onSubmit = async (data: PasswordValues) => {
    setError("");
    const result = await updatePasswordAction({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (result.success) {
      toast.success("Mot de passe mis à jour !");
      form.reset();
    } else {
      setError(result.error || "Une erreur est survenue.");
    }
  };

  const handleSendReset = async () => {
    setSendingReset(true);
    const result = await requestPasswordResetFromProfileAction();
    setSendingReset(false);
    if (result.success) {
      toast.success("Lien envoyé ! Consulte ta boîte de réception.");
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  };

  return (
    <section className={cardClass} aria-labelledby="player-password-title">
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-indigo-50/60 blur-xl" />

      <div className="flex items-start justify-between gap-3">
        <h2 id="player-password-title" className={titleClass}>
          <Lock className="h-4 w-4 text-indigo-500" />
          Mot de passe
        </h2>
        <button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-slate-400 transition-colors hover:text-slate-700"
          aria-label={
            showPasswords
              ? "Masquer les mots de passe"
              : "Afficher les mots de passe"
          }
        >
          {showPasswords ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className={descriptionClass}>
        Choisis un mot de passe solide que tu n&apos;utilises nulle part
        ailleurs.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
        {FIELDS.map(({ name, label, autoComplete }) => (
          <div key={name}>
            <label htmlFor={name} className={labelClass}>
              {label}
            </label>
            <input
              id={name}
              type={showPasswords ? "text" : "password"}
              autoComplete={autoComplete}
              placeholder="••••••••"
              className={inputClass}
              {...form.register(name)}
            />
            {errors[name] && (
              <p className={errorClass}>{errors[name]?.message}</p>
            )}
            {name === "newPassword" && (
              <div className="mt-3">
                <PasswordStrengthIndicator password={newPassword} />
              </div>
            )}
          </div>
        ))}

        {error && <p className={errorClass}>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Modifier le mot de passe
        </button>
      </form>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
        <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
          Mot de passe oublié ?
        </p>
        <p className="text-xs font-medium text-slate-500">
          Reçois un lien de réinitialisation à <strong>{email}</strong>.
        </p>
        <button
          type="button"
          onClick={handleSendReset}
          disabled={sendingReset}
          className={secondaryButtonClass}
        >
          {sendingReset ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Envoyer un lien
        </button>
      </div>
    </section>
  );
}
