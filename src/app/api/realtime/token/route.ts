import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Émet un JWT Supabase court pour l'utilisateur connecté (better-auth), afin
 * d'autoriser ses abonnements Supabase Realtime (Realtime Authorization).
 *
 * L'app n'utilise pas Supabase Auth : on forge donc nous-mêmes un JWT
 * `role: "authenticated"` signé avec le JWT secret du projet Supabase.
 * Les policies RLS (ex. SELECT sur public."Emargement" pour `authenticated`)
 * s'appliquent ensuite à ce rôle. La clé `anon` publique reste, elle,
 * en deny-all → l'API REST/Realtime n'est pas exposée aux anonymes.
 *
 * Ce token ne doit JAMAIS être émis sans session valide.
 */

const TOKEN_TTL_SECONDS = 60 * 60; // 1 h

export async function GET() {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    logger.error("SUPABASE_JWT_SECRET manquant : token Realtime indisponible");
    return NextResponse.json(
      { error: "Realtime indisponible" },
      { status: 503 }
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(session.user.id)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json(
    { token, expiresIn: TOKEN_TTL_SECONDS },
    { headers: { "Cache-Control": "no-store" } }
  );
}
