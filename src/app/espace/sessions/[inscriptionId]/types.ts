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
