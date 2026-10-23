"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSessionDetailsByPin,
  getTraineesByPinAndName,
  getTraineesByPinNameAndDob,
  validatePresencePublic,
} from "../../admin/training/actions";
import {
  TraineeEntry,
  SessionDetails,
  ValidationStep,
  LETTER_COUNT,
} from "../types";

export interface UseValidationReturn {
  step: ValidationStep;
  pin: string;
  letters: string[];
  dob: string;
  filteredTrainees: TraineeEntry[];
  sessionDetails: SessionDetails;
  loading: boolean;
  error: string;
  letterRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  setPin: (pin: string) => void;
  setDob: (dob: string) => void;
  handleVerifyPin: (e: React.FormEvent) => Promise<void>;
  handleLetterChange: (index: number, value: string) => void;
  handleLetterKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  filterTrainees: (currentLetters: string[]) => Promise<void>;
  handleConfirmDob: (e: React.FormEvent) => Promise<void>;
  resetLetters: () => void;
  handleValidatePresence: (emargementId: string) => Promise<void>;
  goBack: () => void;
  restart: () => void;
}

function emptyLetters(): string[] {
  return Array(LETTER_COUNT).fill("");
}

export function useValidation(): UseValidationReturn {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<ValidationStep>("enter_pin");
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [letters, setLetters] = useState<string[]>(emptyLetters);
  const [dob, setDob] = useState("");
  const [requiresDob, setRequiresDob] = useState(false);
  const [filteredTrainees, setFilteredTrainees] = useState<TraineeEntry[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails>({
    title: "",
    slot: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const letterRefs = useRef<Array<HTMLInputElement | null>>(
    Array(LETTER_COUNT).fill(null)
  );

  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && urlPin.length === 6 && step === "enter_pin") {
      verifyPin(urlPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (step === "enter_name") {
      setTimeout(() => letterRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  async function verifyPin(pinToVerify: string) {
    setLoading(true);
    setError("");
    try {
      const data = await getSessionDetailsByPin(pinToVerify);
      setSessionDetails({
        title: data.sessionTitle,
        slot: data.slotLabel,
      });
      setStep("enter_name");
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

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6) return;
    await verifyPin(pin);
  }

  function handleLetterChange(index: number, value: string) {
    const char = value.toUpperCase().replace(/[^A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/g, "");
    const next = [...letters];

    if (!char) {
      next[index] = "";
      setLetters(next);
      return;
    }

    next[index] = char[0];
    setLetters(next);
    setError("");

    if (index < LETTER_COUNT - 1) {
      letterRefs.current[index + 1]?.focus();
    } else if (next.every((l) => l !== "")) {
      filterTrainees(next);
    }
  }

  function handleLetterKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace") {
      if (letters[index]) {
        const next = [...letters];
        next[index] = "";
        setLetters(next);
      } else if (index > 0) {
        letterRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "Enter" && letters.every((l) => l !== "")) {
      filterTrainees(letters);
    }
  }

  async function filterTrainees(currentLetters: string[]) {
    const query = currentLetters.join("");
    setLoading(true);
    setError("");
    try {
      const data = await getTraineesByPinAndName(pin, query);
      setRequiresDob(data.requiresDob);
      if (data.requiresDob) {
        setDob("");
        setStep("enter_dob");
        return;
      }
      if (data.trainees.length === 0) {
        setError("Aucun stagiaire trouvé. Vérifiez les lettres saisies.");
        return;
      }
      setFilteredTrainees(data.trainees);
      setStep("confirm_trainee");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la recherche. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmDob(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!dob) return;

    // La comparaison se fait côté serveur : les dates de naissance ne sont
    // jamais envoyées au navigateur
    setLoading(true);
    try {
      const matches = await getTraineesByPinNameAndDob(
        pin,
        letters.join(""),
        dob
      );
      setFilteredTrainees(matches);
      setStep("confirm_trainee");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Date de naissance incorrecte."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetLetters() {
    setLetters(emptyLetters());
    setError("");
    setTimeout(() => letterRefs.current[0]?.focus(), 100);
  }

  async function handleValidatePresence(emargementId: string) {
    setLoading(true);
    setError("");
    try {
      await validatePresencePublic({
        pin,
        emargementId,
        lastNamePrefix: letters.join(""),
        dateOfBirth: requiresDob ? dob : undefined,
      });
      setStep("success");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la validation. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError("");
    if (step === "enter_name") setStep("enter_pin");
    else if (step === "enter_dob") {
      resetLetters();
      setStep("enter_name");
    } else if (step === "confirm_trainee") {
      if (requiresDob) {
        setStep("enter_dob");
      } else {
        resetLetters();
        setStep("enter_name");
      }
    }
  }

  function restart() {
    setPin("");
    setLetters(emptyLetters());
    setDob("");
    setRequiresDob(false);
    setFilteredTrainees([]);
    setError("");
    setStep("enter_pin");
  }

  return {
    step,
    pin,
    letters,
    dob,
    filteredTrainees,
    sessionDetails,
    loading,
    error,
    letterRefs,
    setPin,
    setDob,
    handleVerifyPin,
    handleLetterChange,
    handleLetterKeyDown,
    filterTrainees,
    handleConfirmDob,
    resetLetters,
    handleValidatePresence,
    goBack,
    restart,
  };
}
