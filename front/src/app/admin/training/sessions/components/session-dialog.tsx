"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createTrainingSession, updateTrainingSession } from "../../actions";
import { TrainingSession } from "../../types";

const sessionSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  type: z.enum(["PSC1", "PSE1", "PSE2", "SST", "IPS"]),
  location: z.string().min(2, "Lieu requis"),
  maxTrainees: z.number().min(1, "Minimum 1 stagiaire"),
  status: z.enum(["planifiée", "en_cours", "terminée", "annulée"]),
});

export type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionDialogProps {
  // We specify clearly that if it's passed it has an id
  sessionItem?: SessionFormValues & { id: string };
  children: React.ReactNode;
}

export function SessionDialog({ sessionItem, children }: SessionDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: sessionItem?.title || "",
      type: sessionItem?.type || "PSC1",
      location: sessionItem?.location || "",
      maxTrainees: sessionItem?.maxTrainees || 10,
      status: sessionItem?.status || "planifiée",
    },
  });

  async function onSubmit(data: SessionFormValues) {
    try {
      if (sessionItem) {
        await updateTrainingSession(sessionItem.id, data);
      } else {
        await createTrainingSession(data);
      }
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Failed to save session", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {sessionItem ? "Modifier la session" : "Créer une session"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre (Ex: Session Grand Public)</FormLabel>
                  <FormControl>
                    <Input placeholder="Formation d'Avril" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de formation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PSC1">PSC1</SelectItem>
                        <SelectItem value="PSE1">PSE1</SelectItem>
                        <SelectItem value="PSE2">PSE2</SelectItem>
                        <SelectItem value="SST">SST</SelectItem>
                        <SelectItem value="IPS">IPS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTrainees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Stagiaires</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : "")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de formation</FormLabel>
                  <FormControl>
                    <Input placeholder="Salle des fêtes, Paris" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {sessionItem && (
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planifiée">Planifiée</SelectItem>
                        <SelectItem value="en_cours">En Cours</SelectItem>
                        <SelectItem value="terminée">Terminée</SelectItem>
                        <SelectItem value="annulée">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
