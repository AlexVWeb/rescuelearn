import type { SlotState } from "@/lib/slot-window";

export interface SlotView {
  id: string;
  label: string;
  dayLabel: string;
  timeRange: string;
  state: SlotState;
  /** « 9h04 » si signé */
  signedAtLabel: string | null;
  /** « 8h45 » : ouverture de l'émargement */
  opensAtLabel: string;
  isToday: boolean;
}

export interface DocumentView {
  id: string;
  title: string;
  sizeLabel: string;
}

export interface PreReadView {
  id: string;
  source: "kit" | "session";
  title: string;
  sizeLabel: string;
  /** « 5 novembre » si pas encore disponible */
  availableLabel: string | null;
  opened: boolean;
}

export interface ReadinessView {
  done: number;
  total: number;
  items: {
    id: string;
    label: string;
    kind: "terms" | "preread" | "manual";
    done: boolean;
  }[];
}

export interface PracticalInfoView {
  location: string;
  accessInfo: string | null;
  mapsUrl: string;
  days: { dayLabel: string; ranges: string[] }[];
  toBring: string[];
  formateurs: string[];
  organisme: { name: string; email: string | null; phone: string | null };
}
