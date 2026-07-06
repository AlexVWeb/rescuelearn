"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  acceptInvitationSchema,
  AcceptInvitationInput,
} from "@/lib/schemas/invitation.schema";
import { acceptInvitationAction } from "@/app/actions/invitation.actions";
import {
  User,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  UserCheck,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AcceptInvitationFormProps {
  token: string;
  email: string;
}

export function AcceptInvitationForm({
  token,
  email,
}: AcceptInvitationFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const form = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      token,
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchPassword = form.watch("password");

  const getStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-200" };

    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasDigit = /\d/.test(pass);
    const hasSpecial = /[^a-zA-Z\d]/.test(pass);
    const hasUnderscore = /_/.test(pass);
    const length = pass.length;

    const isPassphrase = length >= 16 && hasUnderscore;
    const classicCriteria = [hasUpper, hasLower, hasDigit, hasSpecial].filter(
      Boolean
    ).length;

    if (isPassphrase) {
      return {
        score: 100,
        label: "Phrase de passe sécurisée",
        color: "bg-emerald-500",
        mode: "passphrase",
      };
    }

    if (length >= 12 && classicCriteria === 4) {
      return {
        score: 100,
        label: "Mot de passe très fort",
        color: "bg-emerald-500",
        mode: "classic",
      };
    }

    if (length >= 8 && classicCriteria >= 3) {
      return {
        score: 60,
        label: "Moyen",
        color: "bg-amber-500",
        mode: "classic",
      };
    }

    return {
      score: 30,
      label: "Faible",
      color: "bg-rose-500",
      mode: "classic",
    };
  };

  const strength = getStrength(watchPassword);

  // Correction de l'hydratation pour Framer Motion
  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(data: AcceptInvitationInput) {
    setLoading(true);
    const result = await acceptInvitationAction(data);
    setLoading(false);

    if (result.success) {
      toast.success(
        "Compte créé avec succès ! Vous pouvez maintenant vous connecter."
      );
      router.push("/login");
    } else {
      toast.error(result.error || "Une erreur est survenue");
    }
  }

  const container = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -10 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} aria-live="polite">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <motion.div variants={item} className="space-y-2">
            <FormLabel className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </FormLabel>
            <div className="relative">
              <Input
                value={email}
                disabled
                autoComplete="email"
                className="bg-muted/50 h-11 border-none pl-10"
                aria-label="Votre adresse email (déjà renseignée)"
              />
              <Mail
                className="text-muted-foreground/50 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={item}>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User
                        className="h-4 w-4 text-blue-600"
                        aria-hidden="true"
                      />{" "}
                      Prénom
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jean"
                        autoComplete="given-name"
                        {...field}
                        className="h-11 border-slate-200 focus-visible:ring-blue-600"
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            <motion.div variants={item}>
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User
                        className="h-4 w-4 text-blue-600"
                        aria-hidden="true"
                      />{" "}
                      Nom
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dupont"
                        autoComplete="family-name"
                        {...field}
                        className="h-11 border-slate-200 focus-visible:ring-blue-600"
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          </div>

          <motion.div variants={item}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock
                      className="h-4 w-4 text-blue-600"
                      aria-hidden="true"
                    />{" "}
                    Mot de passe
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                        className="h-11 border-slate-200 pr-10 pl-10 focus-visible:ring-blue-600"
                        aria-required="true"
                      />
                      <Lock
                        className="text-muted-foreground/50 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 transition-colors hover:text-blue-600"
                        aria-label={
                          showPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Strength Indicator */}
          {mounted && watchPassword && (
            <motion.div
              variants={item}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                  Force du mot de passe
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    strength.score === 100
                      ? "text-emerald-600"
                      : strength.score >= 60
                        ? "text-amber-600"
                        : "text-rose-600"
                  )}
                >
                  {strength.label}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${strength.score}%` }}
                  className={cn("h-full transition-all", strength.color)}
                />
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <div className="flex items-center gap-2 text-[11px]">
                  {strength.mode === "passphrase" ? (
                    <>
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span className="font-medium text-emerald-700">
                        Mode Phrase de passe activé : longueur optimale
                      </span>
                    </>
                  ) : (
                    <>
                      {strength.score === 100 ? (
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <ShieldAlert className="h-3 w-3 text-rose-500" />
                      )}
                      <span
                        className={cn(
                          strength.score === 100
                            ? "text-emerald-700"
                            : "text-slate-600"
                        )}
                      >
                        12+ caractères, majuscule, chiffre, spécial
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={item}>
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Lock
                      className="h-4 w-4 text-blue-600"
                      aria-hidden="true"
                    />{" "}
                    Confirmer le mot de passe
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                        className="h-11 border-slate-200 pr-10 pl-10 focus-visible:ring-blue-600"
                        aria-required="true"
                      />
                      <Lock
                        className="text-muted-foreground/50 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 transition-colors hover:text-blue-600"
                        aria-label={
                          showConfirmPassword
                            ? "Masquer la confirmation"
                            : "Afficher la confirmation"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <Button
              type="submit"
              className="group h-12 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <UserCheck
                    className="mr-2 h-5 w-5 transition-transform group-hover:scale-110"
                    aria-hidden="true"
                  />
                  Créer mon compte
                  <ArrowRight
                    className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </Form>
  );
}
