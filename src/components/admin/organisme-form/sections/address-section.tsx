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

interface AddressSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function AddressSection({ form }: AddressSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adresse</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-6">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-6">
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="12 rue de la Paix" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Code postal</FormLabel>
              <FormControl>
                <Input placeholder="75001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem className="sm:col-span-4">
              <FormLabel>Ville</FormLabel>
              <FormControl>
                <Input placeholder="Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
