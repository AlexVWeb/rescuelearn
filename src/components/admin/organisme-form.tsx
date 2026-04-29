"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  organismeSchema,
  OrganismeFormValues,
} from "@/lib/schemas/organisme.schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrganismeFormProps {
  defaultValues?: Partial<OrganismeFormValues>;
  onSubmit: (data: OrganismeFormValues) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

export function OrganismeForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = "Enregistrer",
}: OrganismeFormProps) {
  const form = useForm<OrganismeFormValues>({
    resolver: zodResolver(organismeSchema),
    defaultValues: {
      name: "",
      siret: "",
      agreementNumber: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      postalCode: "",
      city: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identification */}
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
                    <Input
                      placeholder="14 chiffres"
                      {...field}
                      maxLength={14}
                    />
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

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@organisme.fr"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="01 23 45 67 89" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Site web</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.organisme.fr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Adresse */}
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

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
