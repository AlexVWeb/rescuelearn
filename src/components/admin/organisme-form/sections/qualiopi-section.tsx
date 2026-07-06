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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";

interface QualiopiSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function QualiopiSection({ form }: QualiopiSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Certification Qualiopi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="isQualiopi"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Certifié Qualiopi</FormLabel>
                <FormDescription>
                  Cochez si l&apos;organisme (ou sa fédération) détient la
                  certification Qualiopi.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {form.watch("isQualiopi") && (
          <FormField
            control={form.control}
            name="qualiopiCertifiedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Détenteur de la certification</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Nom de l'organisme ou de la Fédération"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Précisez si la certification est au nom de l&apos;organisme ou
                  de la fédération.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
