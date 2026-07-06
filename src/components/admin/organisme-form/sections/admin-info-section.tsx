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

interface AdminInfoSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function AdminInfoSection({ form }: AdminInfoSectionProps) {
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
        <FormField
          control={form.control}
          name="federationName"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Fédération de rattachement (si applicable)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Fédération Nationale de Protection Civile"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Utile pour les associations locales rattachées à une fédération
                nationale.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
