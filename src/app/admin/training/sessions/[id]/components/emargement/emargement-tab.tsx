"use client";

import { Button } from "@/components/ui/button";
import { Download, Eye, EyeOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slot, Inscription } from "../../../../types";
import { generateEmargementPDF } from "../../../../lib/pdf-emargement";
import { useEmargement } from "./hooks/use-emargement";
import { EmargementTable } from "./components/emargement-table";
import { StatusLegend } from "./components/status-legend";

export interface EmargementTabProps {
  sessionId: string;
  sessionTitle: string;
  sessionLocation?: string | null;
  sessionType?: string;
  slots: Slot[];
  inscriptions: Inscription[];
}

export function EmargementTab({
  sessionId,
  sessionTitle,
  sessionLocation,
  sessionType,
  slots,
  inscriptions,
}: EmargementTabProps) {
  const {
    loading,
    isAutoRefresh,
    setIsAutoRefresh,
    handleStatusChange,
    handleBulkStatusChange,
    handleGeneratePin,
    handleGenerateSessionPin,
  } = useEmargement({ sessionId, slots });

  if (slots.length === 0) {
    return (
      <div className="p-4 text-center">
        Veuillez d&apos;abord configurer des créneaux dans l&apos;onglet
        Programme.
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div className="p-4 text-center">
        Aucun stagiaire inscrit à cette session.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Tableau d&apos;émargement</h3>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs",
              isAutoRefresh
                ? "text-green-600 hover:bg-green-50"
                : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            title={isAutoRefresh ? "Désactiver le direct" : "Activer le direct"}
          >
            {isAutoRefresh ? (
              <Eye className="mr-2 h-3.5 w-3.5" />
            ) : (
              <EyeOff className="mr-2 h-3.5 w-3.5" />
            )}
            {isAutoRefresh ? "Direct activé" : "Direct désactivé"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateSessionPin}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Générer PIN global
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              generateEmargementPDF(
                {
                  title: sessionTitle,
                  location: sessionLocation,
                  type: sessionType,
                },
                slots,
                inscriptions
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Exporter PDF
          </Button>
        </div>
      </div>

      <EmargementTable
        slots={slots}
        inscriptions={inscriptions}
        loading={loading}
        onStatusChange={handleStatusChange}
        onBulkStatusChange={handleBulkStatusChange}
        onGeneratePin={handleGeneratePin}
      />

      <StatusLegend />
    </div>
  );
}
