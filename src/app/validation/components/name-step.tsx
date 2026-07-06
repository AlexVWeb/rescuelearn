import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionDetails, LETTER_COUNT } from "../types";

interface NameStepProps {
  letters: string[];
  loading: boolean;
  error: string;
  sessionDetails: SessionDetails;
  letterRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  onLetterChange: (index: number, value: string) => void;
  onLetterKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  onSearch: (letters: string[]) => void;
  onRetry: () => void;
  onBack: () => void;
}

export function NameStep({
  letters,
  loading,
  error,
  sessionDetails,
  letterRefs,
  onLetterChange,
  onLetterKeyDown,
  onSearch,
  onRetry,
  onBack,
}: NameStepProps) {
  const isComplete = letters.every((l) => l !== "");

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
          Entrez les {LETTER_COUNT} premières lettres de votre nom de famille
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: LETTER_COUNT }).map((_, i) => (
            <input
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={letters[i]}
              onChange={(e) => onLetterChange(i, e.target.value)}
              onKeyDown={(e) => onLetterKeyDown(i, e)}
              className={cn(
                "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-16 w-14 rounded-md border-2 text-center font-mono text-3xl font-bold tracking-wider uppercase shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                letters[i]
                  ? "border-primary text-primary"
                  : "text-muted-foreground"
              )}
              placeholder="·"
            />
          ))}
        </div>

        {error && (
          <div className="space-y-2 text-center">
            <p className="text-destructive text-sm font-medium">{error}</p>
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Réessayer
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button
            className="flex-1"
            disabled={!isComplete || loading}
            onClick={() => onSearch(letters)}
          >
            Rechercher
          </Button>
        </div>
      </CardContent>
    </>
  );
}
