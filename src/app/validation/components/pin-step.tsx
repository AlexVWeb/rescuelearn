import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface PinStepProps {
  pin: string;
  loading: boolean;
  error: string;
  onPinChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PinStep({
  pin,
  loading,
  error,
  onPinChange,
  onSubmit,
}: PinStepProps) {
  return (
    <>
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">
          Validation de Présence
        </CardTitle>
        <CardDescription>
          Entrez le code à 6 chiffres transmis par votre formateur
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            className="h-16 text-center font-mono text-3xl tracking-[0.5em]"
            placeholder="123456"
            maxLength={6}
            type="text"
            inputMode="numeric"
            value={pin}
            onChange={(e) => onPinChange(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && (
            <p className="text-destructive text-center text-sm font-medium">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pin.length !== 6 || loading}
          >
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Valider le code
          </Button>
        </form>
      </CardContent>
    </>
  );
}
