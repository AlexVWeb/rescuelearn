"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  Activity,
  Brain,
  CheckCircle,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { validateInviteCode, linkUserToOrganisme } from "./actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().optional(),
  email: z.email({
    message: "Email invalide.",
  }),
  password: z.string().min(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères.",
  }),
  inviteCode: z.string().optional(),
});

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      inviteCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);

    if (isSignUp) {
      if (!values.inviteCode) {
        setError("Veuillez entrer un code d'invitation.");
        setLoading(false);
        return;
      }

      const validation = await validateInviteCode(values.inviteCode);
      if (!validation.success) {
        setError(validation.error!);
        setLoading(false);
        return;
      }

      await authClient.signUp.email(
        {
          email: values.email,
          password: values.password,
          name: values.name || "",
        },
        {
          onSuccess: async () => {
            const link = await linkUserToOrganisme(values.inviteCode!);
            if (link.success) {
              router.push("/admin");
            } else {
              setError(link.error!);
              setLoading(false);
            }
          },
          onError: (ctx) => {
            setError(ctx.error.message);
            setLoading(false);
          },
        }
      );
    } else {
      await authClient.signIn.email(
        {
          email: values.email,
          password: values.password,
        },
        {
          onSuccess: () => {
            router.push("/admin");
          },
          onError: (ctx) => {
            setError(ctx.error.message);
            setLoading(false);
          },
        }
      );
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Panneau gauche - branding */}
      <div className="hidden w-1/2 flex-col items-center justify-center bg-blue-600 p-12 lg:flex">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl leading-tight font-bold text-white">
              La plateforme des formateurs en secourisme
            </h2>
            <p className="mt-3 text-blue-200">
              Gérez vos sessions, suivez vos stagiaires et accédez à tous vos
              outils pédagogiques depuis un seul endroit.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              {
                icon: ClipboardList,
                label: "Quiz interactifs basés sur les référentiels DGSCGC",
              },
              {
                icon: Activity,
                label: "Scénarios SNV avec suivi des victimes",
              },
              { icon: Brain, label: "Score de Glasgow et outils d'évaluation" },
              {
                icon: BookOpen,
                label: "Cartes d'apprentissage pour la révision",
              },
              {
                icon: CheckCircle,
                label: "Gestion des sessions et émargements",
              },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-blue-300" />
                <span className="text-sm text-blue-100">{label}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-blue-300">
            Contenu basé sur les référentiels officiels de la DGSCGC
          </p>
        </div>
      </div>

      {/* Panneau droit - formulaire */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        {/* Logo mobile */}
        <Link
          href="/"
          className="mb-8 text-2xl font-bold text-blue-600 lg:hidden"
        >
          RescueLearn
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {isSignUp ? "Créer un compte" : "Connexion"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isSignUp
                ? "Rejoignez RescueLearn avec votre code d'invitation"
                : "Accédez à votre espace formateur"}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {isSignUp && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Nom complet
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            className="border-gray-300 focus-visible:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">
                          Code d&apos;invitation
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Code à 6 caractères"
                            className="border-gray-300 focus-visible:ring-blue-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="vous@exemple.com"
                        className="border-gray-300 focus-visible:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-gray-700">
                        Mot de passe
                      </FormLabel>
                      {!isSignUp && (
                        <a
                          href="#"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Mot de passe oublié ?
                        </a>
                      )}
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        className="border-gray-300 focus-visible:ring-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading
                  ? isSignUp
                    ? "Création du compte..."
                    : "Connexion en cours..."
                  : isSignUp
                    ? "Créer mon compte"
                    : "Se connecter"}
              </button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {isSignUp ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                form.reset();
              }}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {isSignUp ? "Se connecter" : "S'inscrire"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
