// @vitest-environment jsdom
import React, { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

const mockSearch = vi.hoisted(() => ({
  searchAddresses: vi.fn(),
  MIN_QUERY_LENGTH: 3,
}));
vi.mock("@/lib/address-search", () => mockSearch);

import { AddressAutocomplete } from "@/components/address-autocomplete";

const SUGGESTION = {
  id: "1",
  label: "Impasse Chazière 69004 Lyon",
  context: "Rhône",
};

function Field({ initial = "" }: { initial?: string }) {
  const [value, setValue] = React.useState(initial);
  return (
    <StrictMode>
      <AddressAutocomplete
        aria-label="Lieu"
        value={value}
        onChange={setValue}
      />
    </StrictMode>
  );
}

// Laisse passer le debounce puis la promesse de recherche
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(400);
  });
}

describe("AddressAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.searchAddresses.mockResolvedValue([SUGGESTION]);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("n'ouvre rien à l'édition d'une valeur existante", async () => {
    render(<Field initial="Internat Adolphe Favre, Lyon" />);
    await flush();

    expect(mockSearch.searchAddresses).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("n'ouvre rien quand le formulaire change la valeur (reset)", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AddressAutocomplete aria-label="Lieu" value="" onChange={onChange} />
    );
    screen.getByRole("combobox").focus();
    rerender(
      <AddressAutocomplete
        aria-label="Lieu"
        value="Internat Adolphe Favre, Lyon"
        onChange={onChange}
      />
    );
    await flush();

    expect(mockSearch.searchAddresses).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("propose des adresses pendant la saisie", async () => {
    render(<Field />);
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "Chazière" } });
    await flush();

    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(screen.getByText(SUGGESTION.label)).toBeTruthy();
  });

  it("n'ouvre pas la liste si le champ a perdu le focus entre-temps", async () => {
    render(<Field />);
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "Chazière" } });
    fireEvent.blur(input);
    input.blur();
    await flush();

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("ne relance pas de recherche après le choix d'une suggestion", async () => {
    render(<Field />);
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "Chazière" } });
    await flush();

    fireEvent.mouseDown(screen.getByText(SUGGESTION.label));
    await flush();

    expect((input as HTMLInputElement).value).toBe(SUGGESTION.label);
    expect(mockSearch.searchAddresses).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
