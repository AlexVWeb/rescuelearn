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
  createQuestionAction,
  updateQuestionAction,
  Question,
  getAllQuizzesSimpleAction,
} from "@/app/actions/quiz-actions";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

// Assumes 4 options always
const questionSchema = z.object({
  text: z.string().min(5, "La question doit faire au moins 5 caractères."),
  quizId: z.coerce.number().min(1, "Veuillez sélectionner un quiz."),
  explanation: z.string(),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  optionA: z.string().min(1, "Option A requise"),
  optionB: z.string().min(1, "Option B requise"),
  optionC: z.string().min(1, "Option C requise"),
  optionD: z.string().min(1, "Option D requise"),
});

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
}

export function QuestionDialog({
  open,
  onOpenChange,
  question,
}: QuestionDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<{ id: number; title: string }[]>([]);

  useEffect(() => {
    getAllQuizzesSimpleAction().then((data) => setQuizzes(data));
  }, []);

  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      text: "",
      quizId: 0,
      explanation: "",
      correctAnswer: "A",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
    },
  });

  useEffect(() => {
    if (question) {
      // Map options
      const opts = question.options || [];
      form.reset({
        text: question.text,
        quizId: question.quizId,
        explanation: question.explanation || "",
        correctAnswer: question.correctAnswer as "A" | "B" | "C" | "D",
        optionA: opts[0]?.text || "",
        optionB: opts[1]?.text || "",
        optionC: opts[2]?.text || "",
        optionD: opts[3]?.text || "",
      });
    } else {
      form.reset({
        text: "",
        quizId: 0,
        explanation: "",
        correctAnswer: "A",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
      });
    }
  }, [question, form, open]);

  async function onSubmit(values: z.infer<typeof questionSchema>) {
    setIsLoading(true);
    const options = [
      values.optionA,
      values.optionB,
      values.optionC,
      values.optionD,
    ];
    const data = {
      text: values.text,
      quizId: values.quizId,
      explanation: values.explanation,
      correctAnswer: values.correctAnswer,
      options,
    };

    try {
      if (question) {
        await updateQuestionAction(question.id, data);
      } else {
        await createQuestionAction(data);
      }
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      logger.error("Failed to save question", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {question ? "Modifier la question" : "Créer une question"}
          </DialogTitle>
          <DialogDescription>
            Détails de la question et ses 4 choix de réponse.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quizId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un quiz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {quizzes.map((q) => (
                        <SelectItem key={q.id} value={q.id.toString()}>
                          {q.title}
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
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Texte de la question..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="optionA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Option A
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Réponse A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Option B
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Réponse B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Option C
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Réponse C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Option D
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Réponse D" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonne réponse</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir la bonne réponse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">Option A</SelectItem>
                      <SelectItem value="B">Option B</SelectItem>
                      <SelectItem value="C">Option C</SelectItem>
                      <SelectItem value="D">Option D</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Explication affichée après la réponse..."
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
