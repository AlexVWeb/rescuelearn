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

interface IdentificationSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function IdentificationSection({ form }: IdentificationSectionProps) {
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
              <FormControl>
                <Input placeholder="14 chiffres" {...field} maxLength={14} />
              </FormControl>
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
