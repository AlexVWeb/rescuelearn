import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

describe("Middleware - Mode Maintenance", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("laisse passer les requêtes normales si le mode maintenance est désactivé", () => {
    process.env.MAINTENANCE_MODE = "false";
    process.env.MAINTENANCE_BYPASS_TOKEN =
      "supersecrettokenlengthofatleastthirtytwocharacters";

    const request = new NextRequest("https://rescuelearn.fr/dashboard");
    const response = middleware(request);

    // Si on laisse passer, le middleware renvoie NextURL ou undefined ou NextResponse.next()
    // NextResponse.next() renvoie une réponse avec un header spécial x-middleware-next
    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirige vers la page de maintenance si le mode maintenance est activé et sans bypass", () => {
    process.env.MAINTENANCE_MODE = "true";
    process.env.MAINTENANCE_BYPASS_TOKEN =
      "supersecrettokenlengthofatleastthirtytwocharacters";

    const request = new NextRequest("https://rescuelearn.fr/dashboard");
    const response = middleware(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://rescuelearn.fr/maintenance"
    );
  });

  it("laisse passer les requêtes d'assets statiques ou d'API même en mode maintenance", () => {
    process.env.MAINTENANCE_MODE = "true";
    process.env.MAINTENANCE_BYPASS_TOKEN =
      "supersecrettokenlengthofatleastthirtytwocharacters";

    const paths = [
      "https://rescuelearn.fr/_next/static/chunks/main.js",
      "https://rescuelearn.fr/api/auth/session",
      "https://rescuelearn.fr/favicon.ico",
      "https://rescuelearn.fr/logo.png",
      "https://rescuelearn.fr/maintenance",
    ];

    for (const path of paths) {
      const request = new NextRequest(path);
      const response = middleware(request);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("bloque le contournement si le jeton configuré fait moins de 32 caractères", () => {
    process.env.MAINTENANCE_MODE = "true";
    process.env.MAINTENANCE_BYPASS_TOKEN = "too-short"; // < 32 chars

    // Cas 1: Tentative de bypass via query param
    const requestWithParam = new NextRequest(
      "https://rescuelearn.fr/dashboard?bypass=too-short"
    );
    const responseWithParam = middleware(requestWithParam);
    expect(responseWithParam?.headers.get("location")).toBe(
      "https://rescuelearn.fr/maintenance"
    );

    // Cas 2: Tentative de bypass via cookie
    const requestWithCookie = new NextRequest(
      "https://rescuelearn.fr/dashboard"
    );
    requestWithCookie.cookies.set("maintenance_bypass", "too-short");
    const responseWithCookie = middleware(requestWithCookie);
    expect(responseWithCookie?.headers.get("location")).toBe(
      "https://rescuelearn.fr/maintenance"
    );
  });

  it("définit le cookie et redirige pour nettoyer l'URL si le paramètre bypass est valide", () => {
    const secureToken = "supersecrettokenlengthofatleastthirtytwocharacters";
    process.env.MAINTENANCE_MODE = "true";
    process.env.MAINTENANCE_BYPASS_TOKEN = secureToken;

    const request = new NextRequest(
      "https://rescuelearn.fr/dashboard?bypass=" + secureToken
    );
    const response = middleware(request);

    // Doit rediriger vers la même page mais nettoyée
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "https://rescuelearn.fr/dashboard"
    );

    // Doit avoir défini le cookie
    const cookie = response?.cookies.get("maintenance_bypass");
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe(secureToken);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("laisse passer la requête si le cookie de contournement est présent et valide", () => {
    const secureToken = "supersecrettokenlengthofatleastthirtytwocharacters";
    process.env.MAINTENANCE_MODE = "true";
    process.env.MAINTENANCE_BYPASS_TOKEN = secureToken;

    const request = new NextRequest("https://rescuelearn.fr/dashboard");
    request.cookies.set("maintenance_bypass", secureToken);
    const response = middleware(request);

    expect(response?.headers.get("x-middleware-next")).toBe("1");
  });
});
