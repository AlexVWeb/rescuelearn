"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";
import { SiretService } from "@/services/siret.service";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface IdentificationSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function IdentificationSection({ form }: IdentificationSectionProps) {
  const [isSearching, setIsSearching] = useState(false);

  const handleSiretLookup = async (siret: string) => {
    if (!siret || siret.length !== 14) {
      toast.error("Veuillez saisir un SIRET valide (14 chiffres)");
      return;
    }

    setIsSearching(true);
    try {
      const details = await SiretService.searchBySiret(siret);
      if (details) {
        // Mettre à jour les champs du formulaire
        form.setValue("name", details.name, { shouldValidate: true });
        form.setValue("address", details.address, { shouldValidate: true });
        form.setValue("postalCode", details.postalCode, {
          shouldValidate: true,
        });
        form.setValue("city", details.city, { shouldValidate: true });
        if (details.legalStatus) {
          form.setValue("legalStatus", details.legalStatus, {
            shouldValidate: true,
          });
        }

        toast.success("Informations récupérées avec succès");
      } else {
        toast.error("Aucun organisme trouvé pour ce SIRET");
      }
    } catch (error) {
      console.error("SIRET lookup error:", error);
      toast.error("Erreur lors de la récupération des informations");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identification</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Nom de l&apos;organisme *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Croix Rouge Française" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="siret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SIRET</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="14 chiffres"
                    {...field}
                    maxLength={20}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleSiretLookup(field.value || "")}
                  disabled={isSearching || (field.value || "").length !== 14}
                  title="Rechercher les informations"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agreementNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>N° d&apos;agrément</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 11750318975" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
