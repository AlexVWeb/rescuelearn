"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
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
import { updateProfileAction } from "@/app/actions/profile-actions";

const profileSchema = z.object({
  firstName: z.string().min(1, "Requis"),
  lastName: z.string().min(1, "Requis"),
  email: z.email("L'adresse e-mail n'est pas valide"),
  currentPassword: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

interface PersonalInfoCardProps {
  user: { firstName: string | null; lastName: string | null; email: string };
}

export function PersonalInfoCard({ user }: PersonalInfoCardProps) {
  const router = useRouter();
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
      currentPassword: "",
    },
  });

  const watchedEmail = useWatch({
    control: profileForm.control,
    name: "email",
  });

  const isEmailModified =
    watchedEmail !== undefined &&
    watchedEmail.trim().toLowerCase() !== user.email.trim().toLowerCase();

  const onProfileSubmit = async (data: ProfileValues) => {
    setProfileError("");
    setProfileSuccess(false);
    const result = await updateProfileAction(data);
    if (result.success) {
      setProfileSuccess(true);
      profileForm.setValue("currentPassword", "");
      router.refresh();
    } else {
      setProfileError(result.error || "Erreur");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations personnelles</CardTitle>
        <CardDescription>
          Modifiez votre nom et votre adresse e-mail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jean@exemple.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEmailModified && (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Sécurité : Confirmation du mot de passe requis</span>
                </div>
                <p>
                  Pour modifier votre adresse e-mail, veuillez saisir votre mot
                  de passe actuel. Une alerte de sécurité sera transmise à
                  l&apos;ancienne adresse ({user.email}).
                </p>
                <FormField
                  control={profileForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-amber-900 dark:text-amber-100">
                        Mot de passe actuel
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {profileError && (
              <p className="text-destructive text-sm">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-600">Profil mis à jour.</p>
            )}
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
