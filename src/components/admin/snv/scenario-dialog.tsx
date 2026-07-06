"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createScenarioAction,
  updateScenarioAction,
  SNVScenario,
} from "@/app/actions/snv-actions";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

const scenarioSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères."),
  level: z.enum(["Débutant", "Intermédiaire", "Avancé"]),
  description: z
    .string()
    .min(10, "La description doit faire au moins 10 caractères."),
});

interface SNVScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: SNVScenario | null;
}

export function SNVScenarioDialog({
  open,
  onOpenChange,
  scenario,
}: SNVScenarioDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof scenarioSchema>>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: {
      title: "",
      level: "Débutant",
      description: "",
    },
  });

  useEffect(() => {
    if (scenario) {
      form.reset({
        title: scenario.title,
        level: scenario.level as "Débutant" | "Intermédiaire" | "Avancé",
        description: scenario.description,
      });
    } else {
      form.reset({
        title: "",
        level: "Débutant",
        description: "",
      });
    }
  }, [scenario, form, open]);

  async function onSubmit(values: z.infer<typeof scenarioSchema>) {
    setIsLoading(true);
    try {
      if (scenario) {
        await updateScenarioAction(scenario.id, values);
      } else {
        await createScenarioAction(values);
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      logger.error("Failed to save SNV scenario:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {scenario ? "Modifier le scénario" : "Créer un scénario"}
          </DialogTitle>
          <DialogDescription>
            Remplissez les détails du scénario SNV.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre du scénario..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Niveau</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un niveau" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Débutant">Débutant</SelectItem>
                      <SelectItem value="Intermédiaire">
                        Intermédiaire
                      </SelectItem>
                      <SelectItem value="Avancé">Avancé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description détaillée du scénario..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
