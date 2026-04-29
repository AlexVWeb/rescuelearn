import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { TraineeEntry, SessionDetails } from "../types";

interface ConfirmStepProps {
  filteredTrainees: TraineeEntry[];
  sessionDetails: SessionDetails;
  loading: boolean;
  error: string;
  onValidate: (emargementId: string) => void;
  onNotMe: () => void;
}

export function ConfirmStep({
  filteredTrainees,
  sessionDetails,
  loading,
  error,
  onValidate,
  onNotMe,
}: ConfirmStepProps) {
  return (
    <>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-xl font-bold">
          {sessionDetails.title}
        </CardTitle>
        <CardDescription className="text-primary font-medium">
          {sessionDetails.slot}
        </CardDescription>
        <p className="text-muted-foreground pt-2 text-sm">
          {filteredTrainees.length === 1
            ? "Est-ce bien vous ?"
            : "Sélectionnez votre nom :"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-destructive text-center text-sm font-medium">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {filteredTrainees.map((trainee) => (
            <Button
              key={trainee.emargementId}
              variant={trainee.status === "validé" ? "secondary" : "outline"}
              className="h-auto w-full justify-between py-4"
              disabled={trainee.status === "validé" || loading}
              onClick={() => onValidate(trainee.emargementId)}
            >
              <span className="text-base font-semibold">
                {trainee.firstName} {trainee.lastName}
              </span>
              {trainee.status === "validé" ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Déjà validé
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {loading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    "Confirmer ma présence"
                  )}
                </span>
              )}
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          className="w-full"
          onClick={onNotMe}
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ce n&apos;est pas moi
        </Button>
      </CardContent>
    </>
  );
}
