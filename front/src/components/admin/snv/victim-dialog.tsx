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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createVictimAction,
  updateVictimAction,
  SNVVictim,
  getAllScenariosSimpleAction,
} from "@/app/actions/snv-actions";
import { useRouter } from "next/navigation";

const victimSchema = z.object({
  description: z
    .string()
    .min(10, "La description doit faire au moins 10 caractères."),
  explanation: z
    .string()
    .min(10, "L'explication doit faire au moins 10 caractères."),
  correctAnswer: z.coerce.number().min(0).max(3),
  scenarioId: z.coerce.number().min(1, "Veuillez sélectionner un scénario."),
});

interface SNVVictimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  victim: SNVVictim | null;
}

export function SNVVictimDialog({
  open,
  onOpenChange,
  victim,
}: SNVVictimDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState<{ id: number; title: string }[]>(
    []
  );

  useEffect(() => {
    // Fetch scenarios for select
    getAllScenariosSimpleAction().then((data) => setScenarios(data));
  }, []);

  const form = useForm<z.infer<typeof victimSchema>>({
    resolver: zodResolver(victimSchema),
    defaultValues: {
      description: "",
      explanation: "",
      correctAnswer: 0,
      scenarioId: 0,
    },
  });

  useEffect(() => {
    if (victim) {
      form.reset({
        description: victim.description,
        explanation: victim.explanation,
        correctAnswer: victim.correctAnswer,
        scenarioId: victim.scenarioId,
      });
    } else {
      form.reset({
        description: "",
        explanation: "",
        correctAnswer: 0,
        // If scenarios exist, maybe default to first? No, let user choose.
        scenarioId: 0,
      });
    }
  }, [victim, form, open]);

  async function onSubmit(values: z.infer<typeof victimSchema>) {
    setIsLoading(true);
    try {
      if (victim) {
        await updateVictimAction(victim.id, values);
      } else {
        await createVictimAction(values);
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {victim ? "Modifier la victime" : "Créer une victime"}
          </DialogTitle>
          <DialogDescription>
            Remplissez les détails de la victime et associez-la à un scénario.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="scenarioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scénario</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un scénario" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {scenarios.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification (Tri)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un tri" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem
                        value="0"
                        className="font-medium text-green-600"
                      >
                        Vert (Urgence Relative)
                      </SelectItem>
                      <SelectItem
                        value="1"
                        className="font-medium text-yellow-600"
                      >
                        Jaune (Urgence Relative)
                      </SelectItem>
                      <SelectItem
                        value="2"
                        className="font-medium text-red-600"
                      >
                        Rouge (Urgence Absolue)
                      </SelectItem>
                      <SelectItem value="3" className="font-medium text-black">
                        Noir (Décédé)
                      </SelectItem>
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
                  <FormLabel>Description de la victime</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="État de la victime, signes..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explication</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Pourquoi ce tri ?"
                      className="min-h-[100px]"
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
