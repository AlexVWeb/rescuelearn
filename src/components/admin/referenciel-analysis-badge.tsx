"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type AnalysisStatus = "NONE" | "PROCESSING" | "DONE" | "FAILED";

interface ReferencielAnalysisBadgeProps {
  status: AnalysisStatus;
  done: number;
  total: number;
  topicCount: number;
  error?: string | null;
}

export function ReferencielAnalysisBadge({
  status,
  done,
  total,
  topicCount,
  error,
}: ReferencielAnalysisBadgeProps) {
  if (status === "PROCESSING") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {total > 0 ? `Analyse ${done}/${total}` : "Analyse…"}
      </Badge>
    );
  }

  if (status === "DONE") {
    return (
      <Badge className="bg-green-600 text-white">
        {topicCount} sujet{topicCount > 1 ? "s" : ""}
      </Badge>
    );
  }

  if (status === "FAILED") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="cursor-help">
            Échec{topicCount > 0 ? ` · ${topicCount} sujets` : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          {error || "Erreur inconnue"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Badge variant="outline">Non analysé</Badge>;
}
