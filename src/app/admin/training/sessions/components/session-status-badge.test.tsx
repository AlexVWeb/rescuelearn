// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionStatusBadge } from "./session-status-badge";
import { SESSION_STATUS } from "../../types";

describe("SessionStatusBadge", () => {
  it("renders planifiée status correctly", () => {
    render(<SessionStatusBadge status={SESSION_STATUS.PLANIFIEE} />);
    expect(screen.getByText("Planifiée")).toBeDefined();
  });

  it("renders en_cours status correctly", () => {
    render(<SessionStatusBadge status={SESSION_STATUS.EN_COURS} />);
    expect(screen.getByText("En cours")).toBeDefined();
  });

  it("renders terminée status correctly", () => {
    render(<SessionStatusBadge status={SESSION_STATUS.TERMINEE} />);
    expect(screen.getByText("Terminée")).toBeDefined();
  });

  it("renders annulée status correctly", () => {
    render(<SessionStatusBadge status={SESSION_STATUS.ANNULEE} />);
    expect(screen.getByText("Annulée")).toBeDefined();
  });

  it("renders fallback text for unknown status", () => {
    render(<SessionStatusBadge status="unknown_status" />);
    expect(screen.getByText("unknown_status")).toBeDefined();
  });
});
