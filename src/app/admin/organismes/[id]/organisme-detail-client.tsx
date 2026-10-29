"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganismeForm } from "@/components/admin/organisme-form";
import { MembresTab } from "./components/membres-tab";
import { DocumentsTab } from "./components/documents-tab";
import { TemplatesTab } from "./components/templates/templates-tab";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";
import { Organisme, OrganismeMember } from "@/types/organisme";
import { updateOrganismeAction } from "@/app/actions/organisme.actions";
import { InvitationInfo } from "./components/membres-tab";
import { ModulesCard } from "./components/modules-card";
import type { OrganismeModuleState } from "@/lib/organisme-modules/resolve";

const TABS = [
  "profil",
  "configuration",
  "membres",
  "documents",
  "modeles",
  "accueil",
] as const;
type OrganismeTab = (typeof TABS)[number];

function isOrganismeTab(value: string | null): value is OrganismeTab {
  return TABS.includes(value as OrganismeTab);
}

interface OrganismeDetailClientProps {
  organisme: Organisme;
  members: OrganismeMember[];
  invitations: InvitationInfo[];
  /** Logo encodé pour les aperçus PDF */
  logoBase64: string | null;
  modules: OrganismeModuleState[];
  /** Super admin : gère la disponibilité des modules */
  canManageAvailability: boolean;
  /** « Mon organisme » uniquement : les actions portent sur l'organisme courant */
  welcomeTab?: ReactNode;
}

export function OrganismeDetailClient({
  organisme,
  members,
  invitations,
  logoBase64,
  modules,
  canManageAvailability,
  welcomeTab,
}: OrganismeDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const tabParam = searchParams.get("tab");
  const activeTab: OrganismeTab =
    isOrganismeTab(tabParam) && (tabParam !== "accueil" || welcomeTab)
      ? tabParam
      : "profil";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    // API History native : Next synchronise useSearchParams sans refaire le
    // rendu serveur, et le bouton précédent revient à l'onglet d'avant
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  const handleSubmit = async (data: OrganismeFormValues) => {
    setLoading(true);
    try {
      const result = await updateOrganismeAction(organisme.id, data);
      if (result.success) {
        toast.success("Organisme mis à jour");
        router.refresh();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="configuration">Configuration</TabsTrigger>
        <TabsTrigger value="membres">Membres</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="modeles">Modèles documents</TabsTrigger>
        {welcomeTab && (
          <TabsTrigger value="accueil">Accueil stagiaires</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profil" className="mt-6">
        <OrganismeForm
          defaultValues={{
            ...organisme,
            siret: organisme.siret ?? "",
            agreementNumber: organisme.agreementNumber ?? "",
            email: organisme.email ?? "",
            phone: organisme.phone ?? "",
            website: organisme.website ?? "",
            address: organisme.address ?? "",
            postalCode: organisme.postalCode ?? "",
            city: organisme.city ?? "",
            legalRepFirstName: organisme.legalRepFirstName ?? "",
            legalRepLastName: organisme.legalRepLastName ?? "",
            legalRepJobTitle: organisme.legalRepJobTitle ?? "",
            legalStatus: organisme.legalStatus ?? "",
            tvaNumber: organisme.tvaNumber ?? "",
            federation: organisme.federation ?? "",
            federationName: organisme.federationName ?? "",
            documentHeader: organisme.documentHeader ?? "",
            qualiopiCertifiedBy: organisme.qualiopiCertifiedBy ?? "",
            smtpHost: organisme.smtpHost ?? "",
            smtpUser: organisme.smtpUser ?? "",
            smtpPassword: organisme.smtpPassword ?? "",
            smtpFrom: organisme.smtpFrom ?? "",
            smtpPort: organisme.smtpPort ?? undefined,
          }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Mettre à jour le profil"
          showOnly="profil"
          isEdit={true}
        />
      </TabsContent>

      <TabsContent value="configuration" className="mt-6 space-y-6">
        <ModulesCard
          organismeId={organisme.id}
          modules={modules}
          canManageAvailability={canManageAvailability}
        />
        <OrganismeForm
          defaultValues={{
            ...organisme,
            // (Mêmes valeurs que ci-dessus pour la cohérence,
            // mais l'idée est que ce formulaire est le même pour l'instant)
            siret: organisme.siret ?? "",
            agreementNumber: organisme.agreementNumber ?? "",
            email: organisme.email ?? "",
            phone: organisme.phone ?? "",
            website: organisme.website ?? "",
            address: organisme.address ?? "",
            postalCode: organisme.postalCode ?? "",
            city: organisme.city ?? "",
            legalRepFirstName: organisme.legalRepFirstName ?? "",
            legalRepLastName: organisme.legalRepLastName ?? "",
            legalRepJobTitle: organisme.legalRepJobTitle ?? "",
            legalStatus: organisme.legalStatus ?? "",
            tvaNumber: organisme.tvaNumber ?? "",
            federation: organisme.federation ?? "",
            federationName: organisme.federationName ?? "",
            documentHeader: organisme.documentHeader ?? "",
            qualiopiCertifiedBy: organisme.qualiopiCertifiedBy ?? "",
            smtpHost: organisme.smtpHost ?? "",
            smtpUser: organisme.smtpUser ?? "",
            smtpPassword: organisme.smtpPassword ?? "",
            smtpFrom: organisme.smtpFrom ?? "",
            smtpPort: organisme.smtpPort ?? undefined,
          }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Mettre à jour la configuration"
          showOnly="config"
          isEdit={true}
        />
      </TabsContent>

      <TabsContent value="membres" className="mt-6">
        <MembresTab
          organismeId={organisme.id}
          members={members}
          invitations={invitations}
        />
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        <DocumentsTab organismeId={organisme.id} hasLogo={!!organisme.logo} />
      </TabsContent>

      <TabsContent value="modeles" className="mt-6">
        <TemplatesTab
          organisme={{
            name: organisme.name,
            city: organisme.city,
            federation: organisme.federation,
            federationName: organisme.federationName,
            documentHeader: organisme.documentHeader,
          }}
          logoBase64={logoBase64}
        />
      </TabsContent>

      {welcomeTab && (
        <TabsContent value="accueil" className="mt-6 space-y-6">
          {welcomeTab}
        </TabsContent>
      )}
    </Tabs>
  );
}
