"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlayerNav() {
  const pathname = usePathname();

  const isDashboard = pathname === "/player";
  const isProgresser = pathname === "/player/progresser";

  return (
    <nav className="flex items-center gap-2" aria-label="Navigation principale">
      <Link
        href="/player"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isDashboard
            ? "bg-blue-50/50 font-bold text-blue-600"
            : "text-gray-650 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Trophy className="h-4 w-4" />
        Tableau de bord
      </Link>
      <Link
        href="/player/progresser"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isProgresser
            ? "bg-blue-50/50 font-bold text-blue-600"
            : "text-gray-650 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Compass className="h-4 w-4" />
        Progresser
      </Link>
    </nav>
  );
}
