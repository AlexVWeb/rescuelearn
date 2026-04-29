"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dayjs from "dayjs";
import { PlusCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createExternalTraining,
  uploadExternalTrainingFile,
} from "../../../actions";

const TRAINING_TYPES = [
  "PSC",
  "PSE1",
  "PSE2",
  "SST",
  "IPS",
  "FF",
  "FPS",
  "Autre",
];

const schema = z.object({
  type: z.string().min(1, "Type requis"),
  name: z.string().min(2, "Nom requis"),
  organisme: z.string().min(2, "Organisme requis"),
  obtainedAt: z.string().min(1, "Date requise"),
  certificateNumber: z.string().optional(),
  isFC: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  traineeId: string;
}

export function ExternalTrainingDialog({ traineeId }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "",
      name: "",
      organisme: "",
      obtainedAt: "",
      certificateNumber: "",
      isFC: false,
    },
  });

  const obtainedAt = form.watch("obtainedAt");
  const validityDate = obtainedAt
    ? dayjs(obtainedAt).add(1, "year").endOf("year").format("DD/MM/YYYY")
    : "—";

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        let fileKey: string | undefined;

        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadExternalTrainingFile(formData);
          fileKey = result.key;
        }

        await createExternalTraining({
          traineeId,
          type: data.type,
          name: data.name,
          organisme: data.organisme,
          obtainedAt: new Date(data.obtainedAt),
          certificateNumber: data.certificateNumber || undefined,
          isFC: data.isFC,
          fileKey,
        });

        toast.success("Formation externe ajoutée");
        setOpen(false);
        form.reset();
        setFile(null);
        router.refresh();
      } catch {
        toast.error("Une erreur est survenue");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une formation externe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une formation externe</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de formation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRAINING_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
              name="isFC"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Formation Continue (FC)</FormLabel>
                    <FormDescription>
                      Formation continue annuelle obligatoire
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la formation</FormLabel>
                  <FormControl>
                    <Input placeholder="PSC adultes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="organisme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisme dispensateur</FormLabel>
                  <FormControl>
                    <Input placeholder="Croix Rouge Française" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="obtainedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d&apos;obtention</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Date de validité</FormLabel>
                <div className="border-input bg-muted flex h-9 items-center rounded-md border px-3 text-sm">
                  {validityDate}
                </div>
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="certificateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de certificat (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="CERT-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* File upload */}
            <FormItem>
              <FormLabel>Fichier justificatif (optionnel)</FormLabel>
              <div className="flex items-center gap-2">
                <label className="border-input hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {file ? file.name : "Choisir un fichier"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setFile(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Enregistrement..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
