"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default function VerifyEmailPage({ searchParams }: PageProps) {
  const params = use(searchParams);
  const router = useRouter();
  const email = params.email || "";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirection si l'utilisateur est déjà connecté et vérifié
  const { data: session } = authClient.useSession();

  useEffect(() => {
    logger.info("VerifyEmailPage session state", {
      hasSession: !!session,
      user: session?.user,
      emailVerified: session?.user?.emailVerified,
    });
    if (session?.user?.emailVerified) {
      logger.info(
        "Redirecting player to /player because emailVerified is true"
      );
      router.push("/player");
    }
  }, [session, router]);

  async function handleResend() {
    if (!email) {
      setError("Adresse email manquante.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    await authClient.sendVerificationEmail(
      {
        email,
        callbackURL: `${window.location.origin}/player`,
      },
      {
        onSuccess: () => {
          setSuccess("Un nouvel email de validation a été envoyé.");
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Mail
              className="h-8 w-8 animate-pulse text-blue-600"
              aria-hidden="true"
            />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Vérifiez votre boîte mail
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            Un email de validation a été envoyé à l'adresse suivante :
          </p>
          <p className="mt-1 font-semibold break-all text-gray-800">
            {email || "votre adresse email"}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            Veuillez cliquer sur le lien contenu dans cet email pour activer
            votre compte.
          </p>
        </div>

        {success && (
          <div
            className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700"
            role="alert"
          >
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div
            className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleResend}
            disabled={loading}
            className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            {loading ? "Renvoi en cours..." : "Renvoyer l'email de validation"}
          </button>

          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
