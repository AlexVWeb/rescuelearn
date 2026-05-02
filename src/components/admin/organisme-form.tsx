"use client";

import { useForm, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  organismeSchema,
  OrganismeFormValues,
} from "@/lib/schemas/organisme.schema";
import { IdentificationSection } from "./organisme-form/sections/identification-section";
import { LegalRepSection } from "./organisme-form/sections/legal-rep-section";
import { AdminInfoSection } from "./organisme-form/sections/admin-info-section";
import { QualiopiSection } from "./organisme-form/sections/qualiopi-section";
import { ContactSection } from "./organisme-form/sections/contact-section";
import { AddressSection } from "./organisme-form/sections/address-section";
import { RetentionSection } from "./organisme-form/sections/retention-section";
import { SMTPSection } from "./organisme-form/sections/smtp-section";
import { toast } from "sonner";

interface OrganismeFormProps {
  defaultValues?: Partial<OrganismeFormValues>;
  onSubmit: (data: OrganismeFormValues) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  showOnly?: "profil" | "config";
}

export function OrganismeForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = "Enregistrer",
  showOnly,
}: OrganismeFormProps) {
  const form = useForm<OrganismeFormValues>({
    resolver: zodResolver(organismeSchema),
    defaultValues: {
      name: "",
      siret: "",
      agreementNumber: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      postalCode: "",
      city: "",
      legalRepFirstName: "",
      legalRepLastName: "",
      legalRepJobTitle: "",
      legalStatus: "",
      tvaNumber: "",
      federationName: "",
      isQualiopi: false,
      qualiopiCertifiedBy: "",
      retentionYearsActive: 5,
      retentionYearsArchive: 10,
      smtpHost: "",
      smtpPort: 465,
      smtpUser: "",
      smtpPassword: "",
      smtpFrom: "",
      smtpSecure: true,
      ...defaultValues,
    },
  });

  const isProfil = !showOnly || showOnly === "profil";
  const isConfig = !showOnly || showOnly === "config";

  const onError = (errors: FieldErrors<OrganismeFormValues>) => {
    console.error("Form validation errors:", errors);
    const errorValues = Object.values(errors);
    if (errorValues.length > 0) {
      const firstError = errorValues[0];
      toast.error(
        firstError?.message?.toString() ||
          "Veuillez corriger les erreurs dans le formulaire"
      );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onError)}
        className="space-y-6"
      >
        {isProfil && (
          <>
            <IdentificationSection form={form} />
            <LegalRepSection form={form} />
            <AdminInfoSection form={form} />
            <QualiopiSection form={form} />
            <ContactSection form={form} />
            <AddressSection form={form} />
          </>
        )}

        {isConfig && (
          <>
            <RetentionSection form={form} />
            <SMTPSection form={form} />
          </>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
