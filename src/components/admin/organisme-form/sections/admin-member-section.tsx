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

interface AdminMemberSectionProps {
  form: UseFormReturn<OrganismeFormValues>;
}

export function AdminMemberSection({ form }: AdminMemberSectionProps) {
  const createAdmin = form.watch("createAdmin");
  const useContactEmailAsAdmin = form.watch("useContactEmailAsAdmin");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Administrateur initial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="createAdmin"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Créer et inviter un administrateur</FormLabel>
                <FormDescription>
                  Cochez cette case pour envoyer automatiquement une invitation
                  par e-mail à un administrateur pour cet organisme.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {createAdmin && (
          <div className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="useContactEmailAsAdmin"
              render={({ field }) => (
                <FormItem className="bg-muted/30 flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        if (val) {
                          form.setValue("adminEmail", "");
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Utiliser l'adresse e-mail de contact de l'organisme
                    </FormLabel>
                    <FormDescription>
                      L'invitation sera envoyée à l'adresse e-mail de contact de
                      l'organisme renseignée plus bas.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {!useContactEmailAsAdmin && (
              <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail de l'administrateur</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@organisme.fr"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Saisissez l'e-mail personnel du premier administrateur à
                      inviter.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
