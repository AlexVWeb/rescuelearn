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
  createLearningCardAction,
  updateLearningCardAction,
} from "@/app/actions/learning-card-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const cardFormSchema = z.object({
  theme: z.string().min(1, "Le thème est requis"),
  niveau: z.string().min(1, "Le niveau est requis"),
  info: z.string().min(1, "Les informations sont requises"),
  reference: z.string().min(1, "La référence est requise"),
  referencielId: z.string().optional().nullable(),
});

interface ReferencielSimple {
  id: number;
  title: string;
}

interface LearningCardAdmin {
  id: number;
  theme: string;
  niveau: string;
  info: string;
  reference: string;
  referencielId: number | null;
}

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: LearningCardAdmin | null;
  referenciels: ReferencielSimple[];
}

export function CardDialog({
  open,
  onOpenChange,
  card,
  referenciels,
}: CardDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof cardFormSchema>>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      theme: "",
      niveau: "",
      info: "",
      reference: "",
      referencielId: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (card) {
        form.reset({
          theme: card.theme,
          niveau: card.niveau,
          info: card.info,
          reference: card.reference,
          referencielId: card.referencielId?.toString() || "none",
        });
      } else {
        form.reset({
          theme: "",
          niveau: "",
          info: "",
          reference: "",
          referencielId: "none",
        });
      }
    }
  }, [card, open, form]);

  async function onSubmit(values: z.infer<typeof cardFormSchema>) {
    setIsLoading(true);
    const refId =
      values.referencielId === "none" || !values.referencielId
        ? null
        : parseInt(values.referencielId, 10);

    const payload = {
      theme: values.theme,
      niveau: values.niveau,
      info: values.info,
      reference: values.reference,
      referencielId: refId,
    };

    try {
      if (card) {
        // Edit
        const res = await updateLearningCardAction(card.id, payload);
        if (res.success) {
          toast.success("Carte d'apprentissage mise à jour !");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "Une erreur est survenue.");
        }
      } else {
        // Create
        const res = await createLearningCardAction(payload);
        if (res.success) {
          toast.success("Carte d'apprentissage créée !");
          onOpenChange(false);
          router.refresh();
        } else {
          toast.error(res.error || "Une erreur est survenue.");
        }
      }
    } catch {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {card ? "Modifier la carte" : "Nouvelle carte d'apprentissage"}
          </DialogTitle>
          <DialogDescription>
            {card
              ? "Modifiez les informations de la carte pédagogique ci-dessous."
              : "Créez une carte pédagogique de révision manuellement."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thème</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Arrêt cardio-respiratoire..."
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
                name="niveau"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PSE1, PSC1..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referencielId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référentiel</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {referenciels.map((ref) => (
                          <SelectItem key={ref.id} value={ref.id.toString()}>
                            {ref.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informations / Contenu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Saisissez la description pédagogique..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence (Livre/Page)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Page 15, Section II..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Enregistrement..." : "Sauvegarder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
