export type SessionStatus = "planifiée" | "en_cours" | "terminée" | "annulée";
export const SESSION_STATUS = {
  PLANIFIEE: "planifiée",
  EN_COURS: "en_cours",
  TERMINEE: "terminée",
  ANNULEE: "annulée",
} as const;

export type SessionType =
  | "PSC"
  | "PSE1"
  | "PSE2"
  | "SST"
  | "IPS"
  | "FF"
  | "FPS";

export type InscriptionStatus = "inscrit" | "présent" | "absent" | "éliminé";
export const INSCRIPTION_STATUS = {
  INSCRIT: "inscrit",
  PRESENT: "présent",
  ABSENT: "absent",
  ELIMINE: "éliminé",
} as const;

export const ATTESTATION_RESULT = {
  ACQUIS: "acquis",
  NON_ACQUIS: "non_acquis",
} as const;

export type EmargementStatus = "en_attente" | "validé" | "absent";
export const EMARGEMENT_STATUS = {
  EN_ATTENTE: "en_attente",
  VALIDE: "validé",
  ABSENT: "absent",
} as const;

export interface Slot {
  id: string;
  label: string;
  date: Date;
  startTime: string;
  endTime: string;
  trainingSessionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrainingSession {
  id: string;
  type: SessionType;
  title: string;
  location: string;
  status: SessionStatus;
  isFC: boolean;
  maxTrainees: number;
  startDate: Date | null;
  endDate: Date | null;
  formateurId: string;
  organismeId: string;
  createdAt: Date;
  updatedAt: Date;
  slots?: Slot[];
  _count?: {
    inscriptions: number;
  };
}

export interface Trainee {
  id: string;
  civility?: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  birthPlace?: string | null;
  address: string | null;
  organismeId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    inscriptions: number;
  };
}

export interface Emargement {
  id: string;
  inscriptionId: string;
  slotId: string;
  validationCode?: string | null;
  codeSentAt?: Date | null;
  validatedAt: Date | null;
  status: EmargementStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Inscription {
  id: string;
  traineeId: string;
  trainingSessionId: string;
  status:
    | "inscrit"
    | "actée"
    | "annulé"
    | "présent_partiel"
    | "présent"
    | string;
  attestationResult?: string | null;
  attestationValidatedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  trainee?: Trainee;
  emargements?: Emargement[];
}

export interface TrainingSessionWithRelations extends TrainingSession {
  slots: Slot[];
  inscriptions: Inscription[];
}

export type CreateTrainingSessionInput = Omit<
  TrainingSession,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "formateurId"
  | "organismeId"
  | "slots"
  | "_count"
> & {
  status: string;
  type: string;
};

export type UpdateTrainingSessionInput = Partial<CreateTrainingSessionInput>;

export interface ExternalTraining {
  id: string;
  traineeId: string;
  organismeId: string;
  type: string;
  name: string;
  organisme: string;
  obtainedAt: Date;
  isFC: boolean;
  certificateNumber: string | null;
  fileUrl: string | null;
  fileKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InscriptionWithSession extends Inscription {
  trainingSession: TrainingSession;
}

export interface TraineeWithHistory extends Trainee {
  inscriptions: InscriptionWithSession[];
  externalTrainings: ExternalTraining[];
}

export interface TraineeListItem extends Trainee {
  _count: { inscriptions: number };
  validCompetences: string[];
  nextExpiry: string | null; // ISO date string, serializable from server to client
  nextExpiryType: string | null;
}
