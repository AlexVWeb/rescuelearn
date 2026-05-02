"use client";

import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TrainingSession, SESSION_STATUS } from "../../types";
import { formatSessionFormData } from "./session-form.utils";

const sessionSchema = z.object({
  title: z.string().min(3, "Titre requis"),
  type: z.enum(["PSC", "PSE1", "PSE2", "SST", "IPS", "FF", "FPS"]),
  location: z.string().min(2, "Lieu requis"),
  maxTrainees: z.number().min(1, "Minimum 1 stagiaire"),
  status: z.enum([
    SESSION_STATUS.PLANIFIEE,
    SESSION_STATUS.EN_COURS,
    SESSION_STATUS.TERMINEE,
    SESSION_STATUS.ANNULEE,
  ]),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isFC: z.boolean(),
});

export type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  sessionItem?: TrainingSession;
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
      type: sessionItem?.type || "PSC",
      location: sessionItem?.location || "",
      maxTrainees: sessionItem?.maxTrainees || 10,
      status: sessionItem?.status || SESSION_STATUS.PLANIFIEE,
      startDate: sessionItem?.startDate
        ? dayjs(sessionItem.startDate).startOf("day").format("YYYY-MM-DD")
        : "",
      endDate: sessionItem?.endDate
        ? dayjs(sessionItem.endDate).startOf("day").format("YYYY-MM-DD")
        : "",
      isFC: sessionItem?.isFC ?? false,
    },
  });

  async function onSubmit(data: SessionFormValues) {
    try {
      const formattedData = formatSessionFormData(data);

      if (sessionItem) {
        await updateTrainingSession(sessionItem.id, formattedData);
        toast.success("Session mise à jour");
        router.refresh();
        if (onSuccess) onSuccess(sessionItem.id);
      } else {
        const result = await createTrainingSession(formattedData);
        toast.success("Session créée");
        form.reset();
        if (onSuccess) {
          onSuccess(result.id);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      logger.error("Failed to save session", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement"
      );
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
                    <SelectItem value="PSC">PSC</SelectItem>
                    <SelectItem value="PSE1">PSE1</SelectItem>
                    <SelectItem value="PSE2">PSE2</SelectItem>
                    <SelectItem value="SST">SST</SelectItem>
                    <SelectItem value="IPS">IPS</SelectItem>
                    <SelectItem value="FF">FF</SelectItem>
                    <SelectItem value="FPS">FPS</SelectItem>
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
          name="isFC"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Formation Continue (FC)</FormLabel>
                <FormDescription>
                  Cochez si cette session est une formation continue annuelle
                  obligatoire
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

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
                    <SelectItem value={SESSION_STATUS.PLANIFIEE}>
                      Planifiée
                    </SelectItem>
                    <SelectItem value={SESSION_STATUS.EN_COURS}>
                      En Cours
                    </SelectItem>
                    <SelectItem value={SESSION_STATUS.TERMINEE}>
                      Terminée
                    </SelectItem>
                    <SelectItem value={SESSION_STATUS.ANNULEE}>
                      Annulée
                    </SelectItem>
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Enregistrement..."
                : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
