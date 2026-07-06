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
  ArrowLeft,
  Mail,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  validateInviteCode,
  linkUserToOrganisme,
  requestPasswordReset,
} from "./actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type View = "login" | "signup" | "forgot" | "forgot-sent";

const loginSchema = z.object({
  name: z.string().optional(),
  email: z.email({ message: "Email invalide." }),
  password: z.string().min(8, {
    message: "Le mot de passe doit contenir au moins 8 caractères.",
  }),
  inviteCode: z.string().optional(),
});

const forgotSchema = z.object({
  email: z.email({ message: "Email invalide." }),
});

const LEFT_PANEL_FEATURES = [
  {
    icon: ClipboardList,
    label: "Quiz interactifs basés sur les référentiels DGSCGC",
  },
  { icon: Activity, label: "Scénarios SNV avec suivi des victimes" },
  { icon: Brain, label: "Score de Glasgow et outils d'évaluation" },
  { icon: BookOpen, label: "Cartes d'apprentissage pour la révision" },
  { icon: CheckCircle, label: "Gestion des sessions et émargements" },
];

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { name: "", email: "", password: "", inviteCode: "" },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  function switchView(next: View) {
    setView(next);
    setError(null);
    mainForm.reset();
    forgotForm.reset();
  }

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setLoading(true);
    setError(null);

    if (view === "signup") {
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
        { email: values.email, password: values.password },
        {
          onSuccess: () => router.push("/admin"),
          onError: (ctx) => {
            setError(ctx.error.message);
            setLoading(false);
          },
        }
      );
    }
  }

  async function onForgotSubmit(values: z.infer<typeof forgotSchema>) {
    setLoading(true);
    setError(null);

    await requestPasswordReset(values.email);
    setView("forgot-sent");
    setLoading(false);
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
            {LEFT_PANEL_FEATURES.map(({ icon: Icon, label }) => (
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
          {/* Vue : login / signup */}
          {(view === "login" || view === "signup") && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  {view === "signup" ? "Créer un compte" : "Connexion"}
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  {view === "signup"
                    ? "Rejoignez RescueLearn avec votre code d'invitation"
                    : "Accédez à votre espace formateur"}
                </p>
              </div>

              <Form {...mainForm}>
                <form
                  onSubmit={mainForm.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {view === "signup" && (
                    <>
                      <FormField
                        control={mainForm.control}
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
                        control={mainForm.control}
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
                    control={mainForm.control}
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
                    control={mainForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-gray-700">
                            Mot de passe
                          </FormLabel>
                          {view === "login" && (
                            <button
                              type="button"
                              onClick={() => switchView("forgot")}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Mot de passe oublié ?
                            </button>
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
                      ? view === "signup"
                        ? "Création du compte..."
                        : "Connexion en cours..."
                      : view === "signup"
                        ? "Créer mon compte"
                        : "Se connecter"}
                  </button>
                </form>
              </Form>

              <p className="mt-6 text-center text-sm text-gray-500">
                {view === "signup"
                  ? "Déjà un compte ?"
                  : "Pas encore de compte ?"}{" "}
                <button
                  onClick={() =>
                    switchView(view === "signup" ? "login" : "signup")
                  }
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  {view === "signup" ? "Se connecter" : "S'inscrire"}
                </button>
              </p>
            </>
          )}

          {/* Vue : mot de passe oublié */}
          {view === "forgot" && (
            <>
              <button
                onClick={() => switchView("login")}
                className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="size-4" />
                Retour à la connexion
              </button>

              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  Mot de passe oublié
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  Entrez votre email pour recevoir un lien de réinitialisation.
                </p>
              </div>

              <Form {...forgotForm}>
                <form
                  onSubmit={forgotForm.handleSubmit(onForgotSubmit)}
                  className="space-y-5"
                >
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <FormField
                    control={forgotForm.control}
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? "Envoi en cours..." : "Envoyer le lien"}
                  </button>
                </form>
              </Form>
            </>
          )}

          {/* Vue : email envoyé */}
          {view === "forgot-sent" && (
            <div className="text-center">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-100">
                <Mail className="size-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Email envoyé !
              </h1>
              <p className="mt-3 text-sm text-gray-500">
                Si un compte existe pour cette adresse, vous recevrez un lien de
                réinitialisation dans quelques instants. Pensez à vérifier vos
                spams.
              </p>
              <button
                onClick={() => switchView("login")}
                className="mt-8 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
