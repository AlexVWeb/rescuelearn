"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrganismeForm } from "@/components/admin/organisme-form";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";
import { createOrganismeAction } from "@/app/actions/organisme.actions";

export default function NewOrganismePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: OrganismeFormValues) => {
    setLoading(true);
    try {
      const result = await createOrganismeAction(data);
      if (result.success && result.data) {
        toast.success("Organisme créé avec succès");
        router.push(`/admin/organismes/${result.data.id}`);
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/organismes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nouvel organisme
          </h1>
          <p className="text-muted-foreground text-sm">
            Remplissez les informations pour créer un nouvel organisme.
          </p>
        </div>
      </div>

      <OrganismeForm
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel="Créer l'organisme"
      />
    </div>
  );
}
