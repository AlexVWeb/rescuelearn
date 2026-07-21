// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminBreadcrumb } from "./admin-breadcrumb";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("AdminBreadcrumb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if path does not start with /admin", () => {
    vi.mocked(usePathname).mockReturnValue("/other-path");
    const { container } = render(<AdminBreadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  describe("Super Admin space", () => {
    it("renders root Dashboard breadcrumb for /admin", () => {
      vi.mocked(usePathname).mockReturnValue("/admin");
      render(<AdminBreadcrumb />);

      const dashboardPage = screen.getByText("Dashboard");
      expect(dashboardPage).toBeDefined();
      expect(dashboardPage.tagName).toBe("SPAN"); // BreadcrumbPage renders as span (current page)
    });

    it("renders hierarchy for subpaths like /admin/users", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/users");
      render(<AdminBreadcrumb />);

      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      expect(dashboardLink).toBeDefined();
      expect(dashboardLink.getAttribute("href")).toBe("/admin");

      const usersPage = screen.getByText("Utilisateurs");
      expect(usersPage).toBeDefined();
      expect(usersPage.tagName).toBe("SPAN");
    });

    it("renders hierarchy for nested subpaths like /admin/referenciels/questions", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/referenciels/questions");
      render(<AdminBreadcrumb />);

      const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
      expect(dashboardLink.getAttribute("href")).toBe("/admin");

      const referencielsLink = screen.getByRole("link", {
        name: "Référentiels",
      });
      expect(referencielsLink.getAttribute("href")).toBe("/admin/referenciels");

      const questionsPage = screen.getByText("Questions");
      expect(questionsPage.tagName).toBe("SPAN");
    });
  });

  describe("Organisme Admin space", () => {
    it("renders only root Tableau de bord for /admin/training/dashboard", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/training/dashboard");
      render(<AdminBreadcrumb />);

      const dashboardPage = screen.getByText("Tableau de bord");
      expect(dashboardPage).toBeDefined();
      expect(dashboardPage.tagName).toBe("SPAN");

      // Shouldn't render "Dashboard" or "Training"
      expect(screen.queryByText("Dashboard")).toBeNull();
      expect(screen.queryByText("Training")).toBeNull();
    });

    it("renders hierarchy starting with Tableau de bord for /admin/training/sessions", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/training/sessions");
      render(<AdminBreadcrumb />);

      const dashboardLink = screen.getByRole("link", {
        name: "Tableau de bord",
      });
      expect(dashboardLink.getAttribute("href")).toBe(
        "/admin/training/dashboard"
      );

      const sessionsPage = screen.getByText("Sessions");
      expect(sessionsPage.tagName).toBe("SPAN");

      expect(screen.queryByText("Dashboard")).toBeNull();
    });

    it("renders subpaths under training correctly, mapping segments", () => {
      vi.mocked(usePathname).mockReturnValue(
        "/admin/training/stagiaires/123-uuid"
      );
      render(<AdminBreadcrumb />);

      const dashboardLink = screen.getByRole("link", {
        name: "Tableau de bord",
      });
      expect(dashboardLink.getAttribute("href")).toBe(
        "/admin/training/dashboard"
      );

      const stagiairesLink = screen.getByRole("link", { name: "Stagiaires" });
      expect(stagiairesLink.getAttribute("href")).toBe(
        "/admin/training/stagiaires"
      );

      const detailPage = screen.getByText("123-uuid");
      expect(detailPage.tagName).toBe("SPAN");
    });
  });
});
