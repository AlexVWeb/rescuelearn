export interface TraineeEntry {
  emargementId: string;
  slotLabel: string;
  sessionTitle: string;
  traineeId: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface SessionDetails {
  title: string;
  slot: string;
}

export type ValidationStep =
  | "enter_pin"
  | "enter_name"
  | "confirm_trainee"
  | "success";

export const LETTER_COUNT = 3;
