"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  getPlayerOnboardingStatusAction,
  savePlayerOnboardingAction,
  resetPlayerOnboardingAction,
} from "@/app/actions/player-actions";

interface UsePlayerOnboardingOptions {
  /** Appelé une fois le questionnaire terminé (au chargement ou après validation). */
  onCompleted?: () => void | Promise<void>;
  onFinishSuccess?: () => void;
}

export function usePlayerOnboarding({
  onCompleted,
  onFinishSuccess,
}: UsePlayerOnboardingOptions = {}) {
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [experience, setExperience] = useState("");
  const [objective, setObjective] = useState("");
  const [expectation, setExpectation] = useState("");

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await getPlayerOnboardingStatusAction();
        if (res.success && res.data) {
          setOnboardingCompleted(res.data.completed);
          setExperience(res.data.experience);
          setObjective(res.data.objective);
          setExpectation(res.data.expectation);
          if (res.data.completed) {
            await onCompleted?.();
          }
        }
      } finally {
        setLoadingOnboarding(false);
      }
    }
    loadStatus();
    // Chargement initial uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishOnboarding = async () => {
    try {
      const res = await savePlayerOnboardingAction({
        experience,
        objective,
        expectation,
      });
      if (res.success) {
        setOnboardingCompleted(true);
        onFinishSuccess?.();
        toast.success("Profil d'apprentissage configuré avec succès !");
        await onCompleted?.();
      } else {
        toast.error(
          res.error || "Une erreur est survenue lors de la configuration."
        );
      }
    } catch (error) {
      logger.error(
        "Erreur inattendue durant la configuration de l'onboarding :",
        error
      );
      toast.error("Une erreur inattendue est survenue.");
    }
  };

  const resetOnboarding = async () => {
    const res = await resetPlayerOnboardingAction();
    if (res.success) {
      setOnboardingCompleted(false);
      setExperience("");
      setObjective("");
      setExpectation("");
    }
  };

  return {
    onboardingCompleted,
    loadingOnboarding,
    experience,
    setExperience,
    objective,
    setObjective,
    expectation,
    setExpectation,
    finishOnboarding,
    resetOnboarding,
  };
}
