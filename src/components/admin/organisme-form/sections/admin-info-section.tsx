"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminInfoSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

const PREDEFINED_FEDERATIONS = [
  "Croix-Rouge française",
  "Fédération Nationale de Protection Civile (FNPC)",
  "Fédération des Secouristes Français Croix Blanche",
  "Ordre de Malte France",
  "Fédération Française de Sauvetage et de Secourisme (FFSS)",
  "Fédération Nationale des Sapeurs-Pompiers de France (FNSPF)",
  "Association Nationale des Premiers Secours (ANPS)",
  "Union Nationale des Associations de Secouristes et Sauveteurs (UNASS)",
  "Société Nationale de Sauvetage en Mer (SNSM)",
];

export function AdminInfoSection({ form }: AdminInfoSectionProps) {
  const currentFederation = form.watch("federationName") || "";
  const isPredefined =
    PREDEFINED_FEDERATIONS.includes(currentFederation) ||
    currentFederation === "";
  const [showCustom, setShowCustom] = useState(!isPredefined);

  const handleSelectChange = (value: string) => {
    if (value === "none") {
      setShowCustom(false);
      form.setValue("federationName", "");
    } else if (value === "Autre") {
      setShowCustom(true);
      form.setValue("federationName", "");
    } else {
      setShowCustom(false);
      form.setValue("federationName", value);
    }
  };

  const selectValue =
    isPredefined && currentFederation !== ""
      ? currentFederation
      : currentFederation === "" && !showCustom
        ? "none"
        : "Autre";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Informations Administratives
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="legalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut Juridique</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Association loi 1901, SAS, SARL"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tvaNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>N° TVA Intracommunautaire</FormLabel>
              <FormControl>
                <Input placeholder="Ex: FR 12 345678901" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 sm:col-span-2">
          <FormField
            control={form.control}
            name="federationName"
            render={() => (
              <FormItem>
                <FormLabel>
                  Fédération de rattachement (si applicable)
                </FormLabel>
                <Select onValueChange={handleSelectChange} value={selectValue}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une fédération" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucune fédération</SelectItem>
                    {PREDEFINED_FEDERATIONS.map((fed) => (
                      <SelectItem key={fed} value={fed}>
                        {fed}
                      </SelectItem>
                    ))}
                    <SelectItem value="Autre">Autre (préciser...)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Sélectionnez la fédération nationale si votre organisme y est
                  rattaché.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {showCustom && (
            <FormField
              control={form.control}
              name="federationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la fédération</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Fédération Nationale de..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
