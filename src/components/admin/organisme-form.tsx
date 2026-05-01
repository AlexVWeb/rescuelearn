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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoIcon } from "lucide-react";

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
      retentionYearsActive: 5,
      retentionYearsArchive: 10,
      smtpHost: "",
      smtpPort: 465,
      smtpUser: "",
      smtpPassword: "",
      smtpFrom: "",
      smtpSecure: true,
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

        {/* Rétention des données */}
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

        {/* Configuration SMTP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Configuration Email (SMTP)
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-blue-500" />
              Permet à l&apos;organisme d&apos;envoyer les mails (alertes,
              convocations) via son propre serveur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Serveur SMTP</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: smtp.gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="465 ou 587"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utilisateur / Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: contact@votre-domaine.fr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="smtpFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email d&apos;expédition (From)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: RescueLearn <noreply@votre-domaine.fr>"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Connexion sécurisée (SSL/TLS)</FormLabel>
                      <CardDescription>
                        Cochez pour le port 465 (SSL). Décochez pour le port 587
                        (STARTTLS).
                      </CardDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <InfoIcon className="h-4 w-4" /> Aide à la configuration :
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li>
                  <strong>Gmail</strong> : Utilisez le host{" "}
                  <code>smtp.gmail.com</code>, port <code>465</code>, et créez
                  un &quot;Mot de passe d&apos;application&quot;.
                </li>
                <li>
                  <strong>Outlook/Office365</strong> : Host{" "}
                  <code>smtp.office365.com</code>, port <code>587</code>,
                  désactivez SSL (smtpSecure: décoché).
                </li>
                <li>
                  <strong>OVH</strong> : Host <code>ssl0.ovh.net</code>, port{" "}
                  <code>465</code>.
                </li>
              </ul>
            </div>
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
