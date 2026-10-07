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
    expect(screen.getByText("MON PARCOURS")).toBeDefined();
  });

  it("shows the current level and lessons left to unlock the next one", () => {
    render(
      <PlayerStatsBanner
        levelProgress={{
          level: "GQS",
          nextLevel: "PSC",
          completedNodes: 3,
          totalNodes: 5,
        }}
        streak={0}
        xp={0}
        hearts={5}
        soundEnabled={true}
        onToggleSound={vi.fn()}
      />
    );

    expect(screen.getByText("NIVEAU GQS")).toBeDefined();
    expect(
      screen.getByText("Objectif : encore 2 leçons pour débloquer PSC")
    ).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "3"
    );
  });

  it("announces the next level when the path is done but not yet available", () => {
    render(
      <PlayerStatsBanner
        levelProgress={{
          level: "PSC",
          nextLevel: "PSE1",
          completedNodes: 4,
          totalNodes: 4,
        }}
        streak={0}
        xp={0}
        hearts={5}
        soundEnabled={true}
        onToggleSound={vi.fn()}
      />
    );

    expect(
      screen.getByText("Parcours terminé · PSE1 bientôt disponible")
    ).toBeDefined();
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
