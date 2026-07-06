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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createQuizAction,
  updateQuizAction,
  Quiz,
} from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

const quizSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères."),
  timePerQuestion: z.coerce.number().min(5, "Minimum 5 secondes"),
  passingScore: z.coerce.number().min(0).max(100),
  modeRandom: z.boolean(),
});

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
}

export function QuizDialog({ open, onOpenChange, quiz }: QuizDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof quizSchema>>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      timePerQuestion: 30,
      passingScore: 70,
      modeRandom: false,
    },
  });

  useEffect(() => {
    if (quiz) {
      form.reset({
        title: quiz.title,
        timePerQuestion: quiz.timePerQuestion,
        passingScore: quiz.passingScore,
        modeRandom: quiz.modeRandom,
      });
    } else {
      form.reset({
        title: "",
        timePerQuestion: 30,
        passingScore: 70,
        modeRandom: false,
      });
    }
  }, [quiz, form, open]);

  async function onSubmit(values: z.infer<typeof quizSchema>) {
    setIsLoading(true);
    try {
      if (quiz) {
        await updateQuizAction(quiz.id, values);
      } else {
        await createQuizAction(values);
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      logger.error("Failed to save quiz", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {quiz ? "Modifier le quiz" : "Créer un quiz"}
          </DialogTitle>
          <DialogDescription>Configuration globale du quiz.</DialogDescription>
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
                    <Input placeholder="Titre du quiz..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timePerQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps par question (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score de réussite (%)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="modeRandom"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mode Aléatoire</FormLabel>
                    <FormDescription>
                      Si activé, l&apos;ordre des questions sera aléatoire.
                    </FormDescription>
                  </div>
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
