"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetSchema = z
  .object({
    password: z.string().min(8, {
      message: "Le mot de passe doit contenir au moins 8 caractères.",
    }),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    if (!token) {
      setError("Lien invalide ou expiré. Veuillez faire une nouvelle demande.");
      return;
    }

    setLoading(true);
    setError(null);

    await authClient.resetPassword(
      { newPassword: values.password, token },
      {
        onSuccess: () => {
          setSuccess(true);
          setLoading(false);
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      }
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md">
        {!token ? (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Lien invalide ou expiré.{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Retour à la connexion
              </Link>
            </p>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-100">
              <ShieldCheck className="size-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mot de passe mis à jour
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Votre mot de passe a été modifié avec succès.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-8 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Se connecter
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Nouveau mot de passe
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Choisissez un mot de passe d&apos;au moins 8 caractères.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Nouveau mot de passe
                      </FormLabel>
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

                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Confirmer le mot de passe
                      </FormLabel>
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
                  className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                </button>
              </form>
            </Form>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
