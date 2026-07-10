// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerOnboarding } from "@/app/player/components/PlayerOnboarding";

describe("PlayerOnboarding", () => {
  const defaultProps = {
    experience: "",
    setExperience: vi.fn(),
    objective: "",
    setObjective: vi.fn(),
    expectation: "",
    setExpectation: vi.fn(),
    onFinish: vi.fn(),
    playSound: vi.fn(),
  };

  it("renders step 1 question and select", () => {
    render(<PlayerOnboarding {...defaultProps} />);
    expect(
      screen.getByText("Quelle est ton expérience en secourisme ?")
    ).toBeDefined();
    expect(screen.getByRole("combobox")).toBeDefined();
  });

  it("disables continue button when no option is selected", () => {
    render(<PlayerOnboarding {...defaultProps} />);
    const continueButton = screen.getByRole("button", { name: /Continuer/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("enables continue button when experience option is selected", () => {
    render(<PlayerOnboarding {...defaultProps} experience="beginner" />);
    const continueButton = screen.getByRole("button", { name: /Continuer/i });
    expect((continueButton as HTMLButtonElement).disabled).toBe(false);
  });

  it("navigates through steps and calls onFinish on step 4", () => {
    const handleFinish = vi.fn();
    const { rerender } = render(
      <PlayerOnboarding
        {...defaultProps}
        experience="beginner"
        objective="safety"
        expectation="quizzes"
        onFinish={handleFinish}
      />
    );

    // Step 1
    const continueBtn1 = screen.getByRole("button", { name: /Continuer/i });
    fireEvent.click(continueBtn1);

    // Step 2
    rerender(
      <PlayerOnboarding
        {...defaultProps}
        experience="beginner"
        objective="safety"
        expectation="quizzes"
        onFinish={handleFinish}
      />
    );
    const continueBtn2 = screen.getByRole("button", { name: /Continuer/i });
    fireEvent.click(continueBtn2);

    // Step 3
    rerender(
      <PlayerOnboarding
        {...defaultProps}
        experience="beginner"
        objective="safety"
        expectation="quizzes"
        onFinish={handleFinish}
      />
    );
    const continueBtn3 = screen.getByRole("button", { name: /Continuer/i });
    fireEvent.click(continueBtn3);

    // Step 4
    rerender(
      <PlayerOnboarding
        {...defaultProps}
        experience="beginner"
        objective="safety"
        expectation="quizzes"
        onFinish={handleFinish}
      />
    );
    expect(
      screen.getByText("Profil d'apprentissage configuré !")
    ).toBeDefined();
    const finishBtn = screen.getByRole("button", {
      name: /Accéder à mon parcours !/i,
    });
    fireEvent.click(finishBtn);

    expect(handleFinish).toHaveBeenCalledOnce();
  });
});
