"use client";

import { Card } from "@/components/ui/card";
import { useValidation } from "../hooks/use-validation";
import { PinStep } from "./pin-step";
import { NameStep } from "./name-step";
import { ConfirmStep } from "./confirm-step";
import { SuccessStep } from "./success-step";

export function ValidationContent() {
  const {
    step,
    pin,
    letters,
    filteredTrainees,
    sessionDetails,
    loading,
    error,
    letterRefs,
    setPin,
    handleVerifyPin,
    handleLetterChange,
    handleLetterKeyDown,
    filterTrainees,
    resetLetters,
    handleValidatePresence,
    goBack,
    restart,
  } = useValidation();

  return (
    <Card className="w-full max-w-md shadow-lg">
      {step === "enter_pin" && (
        <PinStep
          pin={pin}
          loading={loading}
          error={error}
          onPinChange={setPin}
          onSubmit={handleVerifyPin}
        />
      )}

      {step === "enter_name" && (
        <NameStep
          letters={letters}
          loading={loading}
          error={error}
          sessionDetails={sessionDetails}
          letterRefs={letterRefs}
          onLetterChange={handleLetterChange}
          onLetterKeyDown={handleLetterKeyDown}
          onSearch={filterTrainees}
          onRetry={resetLetters}
          onBack={goBack}
        />
      )}

      {step === "confirm_trainee" && (
        <ConfirmStep
          filteredTrainees={filteredTrainees}
          sessionDetails={sessionDetails}
          loading={loading}
          error={error}
          onValidate={handleValidatePresence}
          onNotMe={goBack}
        />
      )}

      {step === "success" && <SuccessStep onRestart={restart} />}
    </Card>
  );
}
