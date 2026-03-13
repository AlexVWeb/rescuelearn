export type SessionStatus = "planifiée" | "en_cours" | "terminée" | "annulée";
export type SessionType = "PSC" | "PSE1" | "PSE2" | "SST" | "IPS";
export type InscriptionStatus = "inscrit" | "présent" | "absent" | "éliminé";
export type EmargementStatus = "en_attente" | "validé" | "absent";

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
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
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
