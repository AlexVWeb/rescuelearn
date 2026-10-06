"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MailCheck, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/actions/profile-actions";
import {
  cardClass,
  descriptionClass,
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  titleClass,
} from "./styles";

const infoSchema = z.object({
  firstName: z.string().trim().min(1, "Requis"),
  lastName: z.string().trim().min(1, "Requis"),
  email: z.email("L'adresse e-mail n'est pas valide"),
  currentPassword: z.string().optional(),
});

type InfoValues = z.infer<typeof infoSchema>;

interface PlayerInfoCardProps {
  user: { firstName: string; lastName: string; email: string };
}

export function PlayerInfoCard({ user }: PlayerInfoCardProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const form = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { ...user, currentPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const watchedEmail = useWatch({ control: form.control, name: "email" });
  const isEmailModified =
    watchedEmail?.trim().toLowerCase() !== user.email.trim().toLowerCase();

  const onSubmit = async (data: InfoValues) => {
    setError("");
    const result = await updateProfileAction({
      ...data,
      profilePath: "/player/profil",
    });
    if (!result.success) {
      setError(result.error || "Une erreur est survenue.");
      return;
    }
    form.setValue("currentPassword", "");
    if (result.emailChangePending) {
      // L'adresse ne change qu'après les deux confirmations par e-mail
      setPendingEmail(data.email.trim().toLowerCase());
      form.setValue("email", user.email);
      toast.success(`Lien de confirmation envoyé à ${user.email}`);
    } else {
      toast.success("Profil mis à jour !");
    }
    router.refresh();
  };

  return (
    <section className={cardClass} aria-labelledby="player-info-title">
      <div className="pointer-events-none absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-blue-50/60 blur-xl" />

      <h2 id="player-info-title" className={titleClass}>
        <UserRound className="h-4 w-4 text-blue-500" />
        Mes informations
      </h2>
      <p className={descriptionClass}>
        Ton nom apparaît dans le classement et sur tes résultats.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              Prénom
            </label>
            <input
              id="firstName"
              autoComplete="given-name"
              className={inputClass}
              {...form.register("firstName")}
            />
            {errors.firstName && (
              <p className={errorClass}>{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Nom
            </label>
            <input
              id="lastName"
              autoComplete="family-name"
              className={inputClass}
              {...form.register("lastName")}
            />
            {errors.lastName && (
              <p className={errorClass}>{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...form.register("email")}
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        {isEmailModified && (
          <div className="space-y-3 rounded-2xl border-2 border-amber-100 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-xs font-black text-amber-800">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              Confirme avec ton mot de passe actuel
            </p>
            <p className="text-[11px] font-medium text-amber-700">
              Un lien d&apos;approbation sera envoyé à {user.email}, puis un
              lien de vérification à la nouvelle adresse. Ton adresse actuelle
              reste active d&apos;ici là.
            </p>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe actuel"
              className={inputClass}
              {...form.register("currentPassword")}
            />
          </div>
        )}

        {pendingEmail && !isEmailModified && (
          <div className="flex gap-3 rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-4">
            <MailCheck className="h-4 w-4 shrink-0 text-blue-500" />
            <div className="space-y-1 text-[11px] font-medium text-blue-800">
              <p className="text-xs font-black">
                Changement vers {pendingEmail} en attente
              </p>
              <p>
                1. Clique sur le lien reçu à {user.email}. 2. Clique ensuite sur
                celui envoyé à {pendingEmail}.
              </p>
            </div>
          </div>
        )}

        {error && <p className={errorClass}>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </button>
      </form>
    </section>
  );
}
