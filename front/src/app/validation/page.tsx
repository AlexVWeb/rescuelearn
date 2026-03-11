"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTraineesByPin,
  validatePresencePublic,
} from "../admin/training/actions";
import { CheckCircle2, RefreshCw } from "lucide-react";

export default function ValidationPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trainees, setTrainees] = useState<
    Array<{
      emargementId: string;
      slotLabel: string;
      sessionTitle: string;
      traineeId: string;
      firstName: string;
      lastName: string;
      status: string;
    }>
  >([]);
  const [step, setStep] = useState<"enter_pin" | "select_trainee" | "success">(
    "enter_pin"
  );
  const [sessionDetails, setSessionDetails] = useState({ title: "", slot: "" });

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) return;

    setLoading(true);
    setError("");
    try {
      const data = await getTraineesByPin(pin);
      if (data.length > 0) {
        setSessionDetails({
          title: data[0].sessionTitle,
          slot: data[0].slotLabel,
        });
      }
      setTrainees(data);
      setStep("select_trainee");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Code PIN invalide. Vérifiez auprès de votre formateur."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleValidatePresence(emargementId: string) {
    setLoading(true);
    try {
      await validatePresencePublic(emargementId);
      setStep("success");
    } catch (err: unknown) {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        {step === "enter_pin" && (
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
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Input
                    className="h-16 text-center font-mono text-3xl tracking-[0.5em]"
                    placeholder="123456"
                    maxLength={6}
                    type="text"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    disabled={loading}
                  />
                  {error && (
                    <p className="text-destructive mt-2 text-center text-sm font-medium">
                      {error}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={pin.length !== 6 || loading}
                >
                  {loading && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Valider
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "select_trainee" && (
          <>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl font-bold">
                {sessionDetails.title}
              </CardTitle>
              <CardDescription className="text-primary font-medium">
                {sessionDetails.slot}
              </CardDescription>
              <p className="text-muted-foreground pt-2 text-sm">
                Sélectionnez votre nom dans la liste :
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] space-y-3 overflow-y-auto pr-2">
                {error && (
                  <p className="text-destructive mb-4 text-center text-sm font-medium">
                    {error}
                  </p>
                )}

                {trainees.map((trainee) => (
                  <Button
                    key={trainee.emargementId}
                    variant={
                      trainee.status === "validé" ? "secondary" : "outline"
                    }
                    className="h-auto w-full justify-between py-3"
                    disabled={trainee.status === "validé" || loading}
                    onClick={() => handleValidatePresence(trainee.emargementId)}
                  >
                    <span>
                      {trainee.firstName} {trainee.lastName}
                    </span>
                    {trainee.status === "validé" ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Validé
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Cliquez pour valider
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => setStep("enter_pin")}
                disabled={loading}
              >
                Retour
              </Button>
            </CardContent>
          </>
        )}

        {step === "success" && (
          <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6 text-center">
            <CheckCircle2 className="mb-2 h-16 w-16 text-green-500" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Présence Validée !</h2>
              <p className="text-muted-foreground">
                Votre présence a bien été enregistrée pour ce créneau de
                formation.
              </p>
            </div>
            <Button
              className="mt-8"
              variant="outline"
              onClick={() => {
                setPin("");
                setStep("enter_pin");
                setTrainees([]);
              }}
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
