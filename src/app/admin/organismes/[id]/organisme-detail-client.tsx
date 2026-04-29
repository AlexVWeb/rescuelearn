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

interface OrganismeDetailClientProps {
  organisme: Organisme;
  members: OrganismeMember[];
}

export function OrganismeDetailClient({
  organisme,
  members,
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
    <Tabs defaultValue="informations">
      <TabsList>
        <TabsTrigger value="informations">Informations</TabsTrigger>
        <TabsTrigger value="membres">Membres</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      <TabsContent value="informations" className="mt-6">
        <OrganismeForm
          defaultValues={{
            name: organisme.name,
            siret: organisme.siret ?? "",
            agreementNumber: organisme.agreementNumber ?? "",
            email: organisme.email ?? "",
            phone: organisme.phone ?? "",
            website: organisme.website ?? "",
            address: organisme.address ?? "",
            postalCode: organisme.postalCode ?? "",
            city: organisme.city ?? "",
          }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Mettre à jour"
        />
      </TabsContent>

      <TabsContent value="membres" className="mt-6">
        <MembresTab organismeId={organisme.id} members={members} />
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        <DocumentsTab organismeId={organisme.id} hasLogo={!!organisme.logo} />
      </TabsContent>
    </Tabs>
  );
}
