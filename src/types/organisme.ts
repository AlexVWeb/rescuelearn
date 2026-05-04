import { UserRole } from "@/lib/roles";

export type Organisme = {
  // ... existing fields (truncated in replacement content for brevity but kept in target)
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
  legalRepFirstName: string | null;
  legalRepLastName: string | null;
  legalRepJobTitle: string | null;
  legalStatus: string | null;
  tvaNumber: string | null;
  federationName: string | null;
  isQualiopi: boolean;
  qualiopiCertifiedBy: string | null;
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
  roles: UserRole[];
  createdAt: Date;
};
