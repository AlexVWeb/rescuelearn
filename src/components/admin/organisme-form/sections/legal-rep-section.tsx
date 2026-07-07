"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
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

interface LegalRepSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

const PREDEFINED_ROLES = [
  "Président",
  "Vice-Président",
  "Secrétaire Général",
  "Trésorier",
  "Gérant",
  "Directeur / Directrice",
  "Responsable Formation",
];

export function LegalRepSection({ form }: LegalRepSectionProps) {
  const currentJobTitle = form.watch("legalRepJobTitle") || "";
  const isPredefined =
    PREDEFINED_ROLES.includes(currentJobTitle) || currentJobTitle === "";
  const [showCustom, setShowCustom] = useState(!isPredefined);

  const handleSelectChange = (value: string) => {
    if (value === "Autre") {
      setShowCustom(true);
      form.setValue("legalRepJobTitle", "");
    } else {
      setShowCustom(false);
      form.setValue("legalRepJobTitle", value);
    }
  };

  const selectValue =
    isPredefined && currentJobTitle !== ""
      ? currentJobTitle
      : currentJobTitle === "" && !showCustom
        ? ""
        : "Autre";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Représentant Légal</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="legalRepFirstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Prénom du responsable" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="legalRepLastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Nom du responsable" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-4 sm:col-span-2">
          <FormField
            control={form.control}
            name="legalRepJobTitle"
            render={() => (
              <FormItem>
                <FormLabel>Fonction</FormLabel>
                <Select onValueChange={handleSelectChange} value={selectValue}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une fonction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PREDEFINED_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                    <SelectItem value="Autre">Autre (préciser...)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showCustom && (
            <FormField
              control={form.control}
              name="legalRepJobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Précisez votre fonction</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Responsable RH, Délégué, Secrétaire"
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
