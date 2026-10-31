"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { setSentryUser } from "@/lib/sentry/user";

/** Rattache les erreurs navigateur à l'utilisateur connecté (id seul). */
export function SentryUser({
  id,
  roles,
  organismeId,
}: {
  id: string;
  roles: string[];
  organismeId?: string | null;
}) {
  const rolesKey = roles.join(",");

  useEffect(() => {
    setSentryUser({ id, roles: rolesKey.split(","), organismeId });
    return () => {
      Sentry.setUser(null);
    };
  }, [id, rolesKey, organismeId]);

  return null;
}
