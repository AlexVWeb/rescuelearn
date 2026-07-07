import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { SessionDetails } from "../types";

interface DobStepProps {
  dob: string;
  loading: boolean;
  error: string;
  sessionDetails: SessionDetails;
  onDobChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function DobStep({
  dob,
  loading,
  error,
  sessionDetails,
  onDobChange,
  onSubmit,
  onBack,
}: DobStepProps) {
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
          Veuillez renseigner votre date de naissance pour confirmer votre
          identité
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            className="h-12 text-center text-lg"
            type="date"
            value={dob}
            onChange={(e) => onDobChange(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
          {error && (
            <p className="text-destructive text-center text-sm font-medium">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onBack}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button type="submit" className="flex-1" disabled={!dob || loading}>
              Confirmer
            </Button>
          </div>
        </form>
      </CardContent>
    </>
  );
}
