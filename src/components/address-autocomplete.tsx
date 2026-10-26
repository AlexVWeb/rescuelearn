"use client";

import * as React from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MIN_QUERY_LENGTH,
  searchAddresses,
  type AddressSuggestion,
} from "@/lib/address-search";

const DEBOUNCE_MS = 300;

interface AddressAutocompleteProps extends Omit<
  React.ComponentProps<"input">,
  "value" | "onChange"
> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Champ texte libre avec suggestions API Adresse + OpenStreetMap.
 * La saisie libre reste possible (ex : « Salle 2, bâtiment B »).
 */
export function AddressAutocomplete({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  ...props
}: AddressAutocompleteProps) {
  const listId = React.useId();
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  // Évite de relancer une recherche juste après la sélection d'une suggestion
  const skipNextSearch = React.useRef(true);

  React.useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddresses(value, controller.signal);
        setSuggestions(results);
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        // Requête annulée : une saisie plus récente a pris le relais
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function select(suggestion: AddressSuggestion) {
    skipNextSearch.current = true;
    onChange(suggestion.label);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && suggestions.length > 0 && !disabled;

  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        className={cn("pr-8", className)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
      />
      {loading && (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown plutôt que click : se déclenche avant le blur de l'input
              onMouseDown={(e) => {
                e.preventDefault();
                select(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm",
                index === activeIndex && "bg-accent text-accent-foreground"
              )}
            >
              <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">{suggestion.label}</span>
                {suggestion.context && (
                  <span className="text-muted-foreground block truncate text-xs">
                    {suggestion.context}
                  </span>
                )}
              </span>
            </li>
          ))}
          <li
            role="presentation"
            className="text-muted-foreground px-2 pt-1 text-[10px]"
          >
            Sources : API Adresse · © contributeurs OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  );
}
