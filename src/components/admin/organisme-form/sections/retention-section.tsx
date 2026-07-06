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

interface RetentionSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function RetentionSection({ form }: RetentionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rétention des données</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="retentionYearsActive"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durée de conservation active (années)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="retentionYearsArchive"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durée d&apos;archivage légale (années)</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
