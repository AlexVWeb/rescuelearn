import React from "react";
import { Construction } from "lucide-react";

export function InDevelopmentBadge() {
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black tracking-wider text-amber-700 uppercase">
      <Construction className="h-3 w-3" />
      En développement
    </span>
  );
}
