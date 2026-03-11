"use client";

import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { DeleteSessionButton } from "./delete-session-button";

const sessionSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  type: z.enum(["PSC1", "PSE1", "PSE2", "SST", "IPS"]),
  location: z.string().min(2, "Lieu requis"),
  maxTrainees: z.number().min(1, "Minimum 1 stagiaire"),
  status: z.enum(["planifiée", "en_cours", "terminée", "annulée"]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  sessionItem?: SessionFormValues & {
    id: string;
    startDate?: Date | null;
    endDate?: Date | null;
  };
  onCancel?: () => void;
  onSuccess?: (id?: string) => void;
}

export function SessionForm({
  sessionItem,
  onCancel,
  onSuccess,
}: SessionFormProps) {
  const router = useRouter();

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: sessionItem?.title || "",
      type: (sessionItem?.type as any) || "PSC1",
      location: sessionItem?.location || "",
      maxTrainees: sessionItem?.maxTrainees || 10,
      status: sessionItem?.status || "planifiée",
      startDate: sessionItem?.startDate
        ? dayjs(sessionItem.startDate).startOf("day").format("YYYY-MM-DD")
        : "",
      endDate: sessionItem?.endDate
        ? dayjs(sessionItem.endDate).startOf("day").format("YYYY-MM-DD")
        : "",
    },
  });

  async function onSubmit(data: SessionFormValues) {
    try {
      const formattedData = {
        ...data,
        startDate: data.startDate
          ? dayjs(data.startDate).hour(12).toDate()
          : null,
        endDate: data.endDate ? dayjs(data.endDate).hour(12).toDate() : null,
      };

      if (sessionItem) {
        await updateTrainingSession(sessionItem.id, formattedData as any);
        toast.success("Session mise à jour");
        if (onSuccess) onSuccess(sessionItem.id);
        router.refresh();
      } else {
        const result = await createTrainingSession(formattedData as any);
        toast.success("Session créée");
        if (onSuccess) {
          onSuccess((result as any)?.id);
        } else {
          router.refresh();
        }
      }
      form.reset();
    } catch (error) {
      console.error("Failed to save session", error);
    }
  }

  return (
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de formation</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                  />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de début</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de fin</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {sessionItem && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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

        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-2">
            {sessionItem && (
              <DeleteSessionButton
                sessionId={sessionItem.id}
                sessionTitle={sessionItem.title}
              />
            )}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button type="submit">Enregistrer</Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
