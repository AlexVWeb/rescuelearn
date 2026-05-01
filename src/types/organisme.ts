export type Organisme = {
  id: string;
  name: string;
  agreementNumber: string | null;
  logo: string | null;
  inviteCode: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  retentionYearsActive: number;
  retentionYearsArchive: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFrom: string | null;
  smtpSecure: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganismeMember = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  roles: unknown;
  createdAt: Date;
};
