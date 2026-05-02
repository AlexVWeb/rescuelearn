"use client";

import { InfoIcon } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganismeFormValues } from "@/lib/schemas/organisme.schema";

interface SMTPSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function SMTPSection({ form }: SMTPSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuration Email (SMTP)</CardTitle>
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
                  <Input type="number" placeholder="465 ou 587" {...field} />
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
                  <Input type="password" placeholder="••••••••" {...field} />
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
              <code>smtp.gmail.com</code>, port <code>465</code>, et créez un
              &quot;Mot de passe d&apos;application&quot;.
            </li>
            <li>
              <strong>Outlook/Office365</strong> : Host{" "}
              <code>smtp.office365.com</code>, port <code>587</code>, désactivez
              SSL (smtpSecure: décoché).
            </li>
            <li>
              <strong>OVH</strong> : Host <code>ssl0.ovh.net</code>, port{" "}
              <code>465</code>.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
