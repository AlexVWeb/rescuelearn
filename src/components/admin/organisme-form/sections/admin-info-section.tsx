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
import {
  OrganismeFormValues,
  OrganismeFormInput,
} from "@/lib/schemas/organisme.schema";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FEDERATIONS,
  FEDERATION_VALUES,
  type Federation,
} from "@/lib/documents/federations";

interface AdminInfoSectionProps {
  form: UseFormReturn<OrganismeFormInput, unknown, OrganismeFormValues>;
}

export function AdminInfoSection({ form }: AdminInfoSectionProps) {
  const federation = form.watch("federation");

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
            name="federation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Fédération de rattachement (si applicable)
                </FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(
                      value === "none" ? "" : (value as Federation)
                    )
                  }
                  value={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une fédération" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucune fédération</SelectItem>
                    {FEDERATION_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === "AUTRE"
                          ? "Autre (préciser...)"
                          : FEDERATIONS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Détermine les modèles de documents proposés pour vos sessions.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {federation === "AUTRE" && (
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

          <FormField
            control={form.control}
            name="documentHeader"
            render={({ field }) => (
              <FormItem>
                <FormLabel>En-tête des documents</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={
                      "Ex :\nComité départemental Rhône Lyon Métropole\nFédération des Secouristes Français Croix Blanche\nAssociation de Lyon"
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Une ligne par ligne d&apos;en-tête (6 maximum) : comité,
                  fédération, association… À défaut, le nom et la ville de
                  l&apos;organisme sont utilisés.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
