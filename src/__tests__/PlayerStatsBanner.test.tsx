// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerStatsBanner } from "@/app/player/components/PlayerStatsBanner";

describe("PlayerStatsBanner", () => {
  it("renders statistics correctly", () => {
    render(
      <PlayerStatsBanner
        streak={5}
        xp={1250}
        hearts={4}
        soundEnabled={true}
        onToggleSound={vi.fn()}
      />
    );

    expect(screen.getByText("5 J")).toBeDefined();
    expect(screen.getByText("1250 XP")).toBeDefined();
    expect(screen.getByText("4 VIES")).toBeDefined();
    expect(screen.getByText("LIGUE DE BRONZE")).toBeDefined();
  });

  it("calls onToggleSound when sound button is clicked", () => {
    const handleToggleSound = vi.fn();
    render(
      <PlayerStatsBanner
        streak={5}
        xp={1250}
        hearts={5}
        soundEnabled={true}
        onToggleSound={handleToggleSound}
      />
    );

    const button = screen.getByRole("button", { name: /Couper le son/i });
    fireEvent.click(button);
    expect(handleToggleSound).toHaveBeenCalledOnce();
  });
});
