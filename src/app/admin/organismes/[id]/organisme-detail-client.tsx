"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrganismeForm } from "@/components/admin/organisme-form";
import { MembresTab } from "./components/membres-tab";
import { DocumentsTab } from "./components/documents-tab";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";
import { Organisme, OrganismeMember } from "@/types/organisme";
import { updateOrganismeAction } from "@/app/actions/organisme.actions";
import { InvitationInfo } from "./components/membres-tab";

interface OrganismeDetailClientProps {
  organisme: Organisme;
  members: OrganismeMember[];
  invitations: InvitationInfo[];
}

export function OrganismeDetailClient({
  organisme,
  members,
  invitations,
}: OrganismeDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    <Tabs defaultValue="profil">
      <TabsList>
        <TabsTrigger value="profil">Profil</TabsTrigger>
        <TabsTrigger value="configuration">Configuration</TabsTrigger>
        <TabsTrigger value="membres">Membres</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
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
            federationName: organisme.federationName ?? "",
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

      <TabsContent value="configuration" className="mt-6">
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
            federationName: organisme.federationName ?? "",
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
    </Tabs>
  );
}
