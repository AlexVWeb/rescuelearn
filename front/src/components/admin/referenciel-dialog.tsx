"use client";

import dayjs from "dayjs";
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
import {
  createReferencielAction,
  updateReferencielAction,
  Referenciel,
} from "@/app/actions/referenciel-actions";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/ui/file-upload";

const referencielSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  yearEdition: z.coerce.number().min(1900).max(2100),
});

interface ReferencielDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referenciel: Referenciel | null;
}

export function ReferencielDialog({
  open,
  onOpenChange,
  referenciel,
}: ReferencielDialogProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof referencielSchema>>({
    resolver: zodResolver(referencielSchema) as any,
    defaultValues: {
      title: "",
      yearEdition: dayjs().year(),
    },
  });

  useEffect(() => {
    if (referenciel) {
      form.reset({
        title: referenciel.title,
        yearEdition: referenciel.yearEdition,
      });
      setFile(null); // Reset file on edit open, user must re-upload if they want to change it
    } else {
      form.reset({
        title: "",
        yearEdition: dayjs().year(),
      });
      setFile(null);
    }
  }, [referenciel, form, open]);

  async function onSubmit(values: z.infer<typeof referencielSchema>) {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("yearEdition", values.yearEdition.toString());

      if (file) {
        formData.append("file", file);
      }

      if (referenciel) {
        // Update
        const result = await updateReferencielAction(referenciel.id, formData);
        if (!result.success) {
          // Handle error (ideally with toast)
          console.error(result.error);
        }
      } else {
        // Create
        if (!file) {
          // Force file for creation
          console.error("File is required");
          setIsLoading(false);
          return; // Or show error
        }
        const result = await createReferencielAction(formData);
        if (!result.success) {
          console.error(result.error);
        }
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {referenciel ? "Modifier le référentiel" : "Nouveau référentiel"}
          </DialogTitle>
          <DialogDescription>
            {referenciel
              ? "Modifiez les détails du référentiel ici. Cliquez sur sauvegarder une fois terminé."
              : "Ajoutez un nouveau référentiel à la bibliothèque."}
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
                    <Input placeholder="PSC, PSE1..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearEdition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Année d'édition</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Fichier PDF</FormLabel>
              <FileUpload
                onFileSelect={setFile}
                accept={{ "application/pdf": [".pdf"] }}
                currentFileUrl={referenciel?.pdfUrl}
              />
            </div>

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
