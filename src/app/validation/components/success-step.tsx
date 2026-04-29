import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface SuccessStepProps {
  onRestart: () => void;
}

export function SuccessStep({ onRestart }: SuccessStepProps) {
  return (
    <CardContent className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <CheckCircle2 className="mb-2 h-20 w-20 text-green-500" />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Présence Validée !</h2>
        <p className="text-muted-foreground">
          Votre présence a bien été enregistrée pour ce créneau de formation.
        </p>
      </div>
      <Button className="mt-4" variant="outline" onClick={onRestart}>
        Retour à l&apos;accueil
      </Button>
    </CardContent>
  );
}
