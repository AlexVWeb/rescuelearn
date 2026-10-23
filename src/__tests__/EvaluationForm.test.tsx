// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const mockActions = vi.hoisted(() => ({
  saveEvaluationDraft: vi.fn(),
  submitEvaluation: vi.fn(),
}));
vi.mock(
  "@/app/espace/sessions/[inscriptionId]/evaluations/actions",
  () => mockActions
);

import { EvaluationForm } from "@/app/espace/sessions/[inscriptionId]/evaluations/[type]/evaluation-form";
import { getCurrentQuestionnaire } from "@/lib/evaluation/questionnaires";

const cold = getCurrentQuestionnaire("froid");

function renderForm(initialAnswers = {}) {
  return render(
    <EvaluationForm
      inscriptionId="ins-1"
      questionnaire={cold}
      initialAnswers={initialAnswers}
      alreadySubmitted={false}
      organismeName="Secours 31"
      closesAtLabel="18 février"
    />
  );
}

// Étape masquée : un ancêtre porte l'attribut `hidden`
const isHidden = (element: Element) => element.closest("[hidden]") !== null;
const progress = () => screen.getByRole("progressbar");
const next = () => screen.getByRole("button", { name: /Suivant/ });

beforeEach(() => {
  mockActions.saveEvaluationDraft.mockResolvedValue({
    status: "saved",
    savedAt: "2027-01-20T09:00:00.000Z",
  });
  mockActions.submitEvaluation.mockResolvedValue({ status: "idle" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EvaluationForm", () => {
  it("affiche une section par étape avec une progression accessible", () => {
    renderForm();
    expect(progress().getAttribute("aria-valuenow")).toBe("1");
    expect(progress().getAttribute("aria-valuemax")).toBe("4");
    expect(progress().getAttribute("aria-valuetext")).toBe(
      "Étape 1 sur 4 : Mise en pratique"
    );
    expect(
      isHidden(screen.getByRole("heading", { name: "Mise en pratique" }))
    ).toBe(false);
    // Les étapes suivantes restent dans le formulaire, masquées
    expect(
      isHidden(
        screen.getByRole("heading", {
          name: "Utilité et acquis",
          level: 2,
          hidden: true,
        })
      )
    ).toBe(true);
  });

  it("chaque question est un groupe nommé, les notes sont des radios natifs", () => {
    renderForm();
    const group = screen.getByRole("group", {
      name: /avez-vous utilisé vos acquis/,
    });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("value"))).toEqual(["oui", "non"]);
    expect(radios[0].getAttribute("name")).toBe("situation_reelle");
  });

  it("bloque l'étape incomplète, relie l'erreur et place le focus sur le champ", () => {
    renderForm();
    fireEvent.click(next());

    const radio = screen.getByRole("radio", { name: "Oui" });
    expect(document.activeElement).toBe(radio);
    expect(radio.getAttribute("aria-invalid")).toBe("true");
    const describedBy = radio.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toMatch(
      "Merci de répondre à cette question."
    );
    expect(progress().getAttribute("aria-valuenow")).toBe("1");
    expect(mockActions.saveEvaluationDraft).not.toHaveBeenCalled();
  });

  it("passe à l'étape suivante, enregistre le brouillon et déplace le focus sur le titre", async () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Non" }));
    await act(async () => {
      fireEvent.click(next());
    });

    expect(progress().getAttribute("aria-valuenow")).toBe("2");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Utilité et acquis" })
    );
    expect(mockActions.saveEvaluationDraft).toHaveBeenCalledTimes(1);
    const formData = mockActions.saveEvaluationDraft.mock.calls[0][3];
    expect(formData.get("situation_reelle")).toBe("non");
    expect((await screen.findByRole("status")).textContent).toMatch(
      /Réponses enregistrées à/
    );
  });

  it("le récapitulatif reprend les réponses et propose de modifier une section", async () => {
    renderForm({
      situation_reelle: true,
      utilite: 4,
      souvenir_gestes: 3,
      souhait_recyclage: false,
      nps: 10,
    });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        fireEvent.click(next());
      });
    }

    expect(progress().getAttribute("aria-valuetext")).toBe(
      "Étape 4 sur 4 : Récapitulatif et envoi"
    );
    expect(
      isHidden(
        screen.getByText("4 sur 4 · Tout à fait d'accord", { selector: "dd" })
      )
    ).toBe(false);
    expect(isHidden(screen.getByText("10 sur 10", { selector: "dd" }))).toBe(
      false
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Modifier.*Utilité et acquis/ })
    );
    expect(progress().getAttribute("aria-valuenow")).toBe("2");
  });

  it("refuse l'envoi sans consentement et place le focus sur la case", async () => {
    renderForm({
      situation_reelle: true,
      utilite: 4,
      souvenir_gestes: 3,
      souhait_recyclage: false,
      nps: 10,
    });
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        fireEvent.click(next());
      });
    }
    const consent = screen.getByRole("checkbox", { name: /J'accepte/ });
    expect((consent as HTMLInputElement).checked).toBe(false);

    fireEvent.click(
      screen.getByRole("button", { name: /Envoyer mes réponses/ })
    );

    expect(document.activeElement).toBe(consent);
    expect(consent.getAttribute("aria-invalid")).toBe("true");
    expect(mockActions.submitEvaluation).not.toHaveBeenCalled();
  });

  it("le NPS propose 11 notes de 0 à 10, nommées pour les lecteurs d'écran", async () => {
    renderForm({
      situation_reelle: false,
      utilite: 4,
      souvenir_gestes: 3,
      souhait_recyclage: false,
    });
    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        fireEvent.click(next());
      });
    }
    const group = screen.getByRole("group", { name: /Recommanderiez-vous/ });
    const notes = within(group).getAllByRole("radio");
    expect(notes).toHaveLength(11);
    expect(
      isHidden(within(group).getByRole("radio", { name: "7 sur 10" }))
    ).toBe(false);
  });

  it("limite le texte libre à 2000 caractères avec un compteur relié", async () => {
    renderForm({
      situation_reelle: false,
      utilite: 4,
      souvenir_gestes: 3,
      souhait_recyclage: false,
    });
    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        fireEvent.click(next());
      });
    }
    const textarea = screen.getByRole("textbox", {
      name: /Un commentaire/,
    });
    expect(textarea.getAttribute("maxLength")).toBe("2000");
    fireEvent.change(textarea, { target: { value: "Très utile" } });
    expect(isHidden(screen.getByText("10 / 2000 caractères"))).toBe(false);
  });
});
