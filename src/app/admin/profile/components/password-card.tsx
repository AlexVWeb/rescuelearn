"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  updatePasswordAction,
  requestPasswordResetFromProfileAction,
} from "@/app/actions/profile-actions";
import { PasswordStrengthIndicator } from "./password-strength-indicator";

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

interface PasswordCardProps {
  userEmail: string;
}

export function PasswordCard({ userEmail }: PasswordCardProps) {
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [resetEmailError, setResetEmailError] = useState("");
  const [resetEmailSuccess, setResetEmailSuccess] = useState(false);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const watchNewPassword = useWatch({
    control: passwordForm.control,
    name: "newPassword",
  });

  const onPasswordSubmit = async (data: PasswordValues) => {
    setPasswordError("");
    setPasswordSuccess(false);
    const result = await updatePasswordAction({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (result.success) {
      setPasswordSuccess(true);
      passwordForm.reset();
    } else {
      setPasswordError(result.error || "Erreur");
    }
  };

  const handleRequestResetEmail = async () => {
    setResetEmailSending(true);
    setResetEmailError("");
    setResetEmailSuccess(false);

    const result = await requestPasswordResetFromProfileAction();
    setResetEmailSending(false);

    if (result.success) {
      setResetEmailSuccess(true);
    } else {
      setResetEmailError(result.error || "Une erreur est survenue.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
        <CardDescription>
          Modifiez votre mot de passe de connexion ou demandez un lien de
          réinitialisation par e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...passwordForm}>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe actuel</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                        aria-label={
                          showCurrentPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showCurrentPassword ? (
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

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                        aria-label={
                          showNewPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showNewPassword ? (
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

            {/* Visualisateur de complexité du mot de passe */}
            <PasswordStrengthIndicator password={watchNewPassword} />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                        aria-label={
                          showConfirmPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
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

            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">Mot de passe mis à jour.</p>
            )}
            <Button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
            >
              {passwordForm.formState.isSubmitting
                ? "Enregistrement..."
                : "Modifier le mot de passe"}
            </Button>
          </form>
        </Form>

        <div className="border-t pt-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Réinitialisation par e-mail</h4>
            <p className="text-muted-foreground text-xs">
              Recevez un lien sécurisé par e-mail à l&apos;adresse{" "}
              <strong>{userEmail}</strong> pour choisir un nouveau mot de passe.
            </p>
            {resetEmailError && (
              <p className="text-destructive text-sm">{resetEmailError}</p>
            )}
            {resetEmailSuccess && (
              <p className="text-sm font-medium text-green-600">
                Un e-mail de réinitialisation vous a été envoyé. Veuillez
                consulter votre boîte de réception.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestResetEmail}
              disabled={resetEmailSending}
              className="mt-2"
            >
              {resetEmailSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi de l&apos;e-mail...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer un lien de réinitialisation
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
