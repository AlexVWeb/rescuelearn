import { describe, it, expect } from "vitest";
import {
  attestationFileName,
  renderAttestationPDF,
  formatAttestationDate,
  formatAttestationHoraires,
  formatAttestationDuration,
} from "./pdf-attestation-fin-formation-psc-export";
import type { Inscription, Slot } from "../types";

const inscription = {
  id: "ins-1",
  traineeId: "t-1",
  trainingSessionId: "ts-1",
  status: "présent",
  attestationResult: "acquis",
  attestationValidatedAt: new Date("2026-11-16"),
  trainee: { firstName: "Léa", lastName: "Martin" },
} as unknown as Inscription;

describe("formatAttestationDate", () => {
  it("retourne 'Non spécifiée' si aucune date n'est disponible", () => {
    expect(formatAttestationDate({ slots: [] })).toBe("Non spécifiée");
  });

  it("retourne la date unique pour une session d'une seule journée sans slots", () => {
    expect(
      formatAttestationDate({
        startDate: new Date("2026-10-22T00:00:00.000Z"),
        slots: [],
      })
    ).toBe("22/10/2026");
  });

  it("retourne la plage de dates quand startDate et endDate diffèrent", () => {
    expect(
      formatAttestationDate({
        startDate: new Date("2026-10-22T00:00:00.000Z"),
        endDate: new Date("2026-10-23T00:00:00.000Z"),
        slots: [],
      })
    ).toBe("du 22/10/2026 au 23/10/2026");
  });

  it("détecte une session d'une seule journée à partir des créneaux", () => {
    const slots = [
      {
        id: "s1",
        label: "Matin",
        date: new Date("2026-10-22T00:00:00.000Z"),
        startTime: "09:00",
        endTime: "12:30",
        trainingSessionId: "ts-1",
      },
      {
        id: "s2",
        label: "Après-midi",
        date: new Date("2026-10-22T00:00:00.000Z"),
        startTime: "13:30",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
    ] as Slot[];

    expect(formatAttestationDate({ slots })).toBe("22/10/2026");
  });

  it("détecte une session multi-jours à partir des créneaux (ex: formation 14h sur 2 jours)", () => {
    const slots = [
      {
        id: "s1",
        label: "Jour 1",
        date: new Date("2026-10-22T00:00:00.000Z"),
        startTime: "09:00",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
      {
        id: "s2",
        label: "Jour 2",
        date: new Date("2026-10-23T00:00:00.000Z"),
        startTime: "09:00",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
    ] as Slot[];

    expect(
      formatAttestationDate({
        startDate: new Date("2026-10-22T00:00:00.000Z"),
        slots,
      })
    ).toBe("du 22/10/2026 au 23/10/2026");
  });
});

describe("formatAttestationHoraires", () => {
  it("retourne 'Non spécifiés' si aucun créneau", () => {
    expect(formatAttestationHoraires([])).toBe("Non spécifiés");
  });

  it("calcule la plage entre le début le plus tôt et la fin la plus tardive", () => {
    const slots = [
      {
        id: "s2",
        label: "Après-midi",
        date: new Date("2026-10-22"),
        startTime: "13:30",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
      {
        id: "s1",
        label: "Matin",
        date: new Date("2026-10-22"),
        startTime: "09:00",
        endTime: "12:30",
        trainingSessionId: "ts-1",
      },
    ] as Slot[];

    expect(formatAttestationHoraires(slots)).toBe("09:00 - 17:00");
  });
});

describe("formatAttestationDuration", () => {
  it("retourne 0 si aucun créneau", () => {
    expect(formatAttestationDuration([])).toBe(0);
  });

  it("calcule la somme de tous les créneaux", () => {
    const slots = [
      {
        id: "s1",
        label: "Jour 1",
        date: new Date("2026-10-22"),
        startTime: "09:00",
        endTime: "16:00",
        trainingSessionId: "ts-1",
      }, // 7h
      {
        id: "s2",
        label: "Jour 2",
        date: new Date("2026-10-23"),
        startTime: "09:00",
        endTime: "16:00",
        trainingSessionId: "ts-1",
      }, // 7h
    ] as Slot[];

    expect(formatAttestationDuration(slots)).toBe(14);
  });
});

describe("renderAttestationPDF", () => {
  it("produit un PDF côté serveur pour une session multi-jours", async () => {
    const slots = [
      {
        id: "s1",
        label: "Jour 1",
        date: new Date("2026-10-22"),
        startTime: "09:00",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
      {
        id: "s2",
        label: "Jour 2",
        date: new Date("2026-10-23"),
        startTime: "09:00",
        endTime: "17:00",
        trainingSessionId: "ts-1",
      },
    ] as Slot[];

    const bytes = await renderAttestationPDF(
      {
        title: "Formation PSC - 14h",
        location: "Lyon",
        startDate: new Date("2026-10-22"),
        endDate: new Date("2026-10-23"),
        slots,
      },
      inscription,
      { lastName: "Bernard", firstName: "Hugo" }
    );
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("nomme le fichier d'après le stagiaire", () => {
    expect(attestationFileName(inscription)).toBe("Attestation_Martin_Léa.pdf");
  });
});
