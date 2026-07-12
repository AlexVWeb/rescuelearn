"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

export function PlayerSignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSignOut = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
            router.refresh();
          },
          onError: (ctx) => {
            setIsPending(false);
            logger.error("Sign out error in player layout", ctx.error);
          },
        },
      });
    } catch (error) {
      setIsPending(false);
      logger.error("Sign out thrown error in player layout", error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50"
      aria-label="Se déconnecter"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">
        {isPending ? "Déconnexion..." : "Déconnexion"}
      </span>
    </button>
  );
}
