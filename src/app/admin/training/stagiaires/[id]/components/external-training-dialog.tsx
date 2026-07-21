"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dayjs from "dayjs";
import { PlusCircle, Upload, Pencil, FileText } from "lucide-react";
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
  updateExternalTraining,
  uploadExternalTrainingFile,
} from "../../../actions";
import { ExternalTraining, InscriptionWithSession } from "../../../types";

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
  name: z.string().optional(),
  organisme: z.string().min(2, "Organisme requis"),
  obtainedAt: z.string().min(1, "Date requise"),
  certificateNumber: z.string().optional(),
  isFC: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  traineeId: string;
  training?: ExternalTraining;
  inscriptions?: InscriptionWithSession[];
  externalTrainings?: ExternalTraining[];
  trigger?: React.ReactNode;
}

export function ExternalTrainingDialog({
  traineeId,
  training,
  inscriptions = [],
  externalTrainings = [],
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEditing = !!training;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: training?.type ?? "",
      name: training?.name ?? "",
      organisme: training?.organisme ?? "",
      obtainedAt: training?.obtainedAt
        ? dayjs(training.obtainedAt).format("YYYY-MM-DD")
        : "",
      certificateNumber: training?.certificateNumber ?? "",
      isFC: training?.isFC ?? false,
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });

  // Determine if initial training exists for the selected type
  const hasInitialTraining = Boolean(
    selectedType &&
    (inscriptions.some(
      (i) =>
        i.trainingSession.type === selectedType &&
        i.status === "présent" &&
        !i.trainingSession.isFC
    ) ||
      externalTrainings.some(
        (e) =>
          e.type === selectedType &&
          !e.isFC &&
          (isEditing ? e.id !== training.id : true)
      ))
  );

  // Automatically uncheck FC only when the type changes and has no initial training
  useEffect(() => {
    if (selectedType && !hasInitialTraining) {
      // Only set to false if the user is changing the type to something that doesn't match the current record's type,
      // or if it was not already checked in the database to prevent blocking edits of existing anomalies.
      if (!isEditing || selectedType !== training.type) {
        form.setValue("isFC", false);
      }
    }
  }, [selectedType, hasInitialTraining, isEditing, training, form]);

  const obtainedAt = useWatch({
    control: form.control,
    name: "obtainedAt",
  });
  const validityDate = obtainedAt
    ? dayjs(obtainedAt).add(1, "year").endOf("year").format("DD/MM/YYYY")
    : "—";

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      form.reset({
        type: training?.type ?? "",
        name: training?.name ?? "",
        organisme: training?.organisme ?? "",
        obtainedAt: training?.obtainedAt
          ? dayjs(training.obtainedAt).format("YYYY-MM-DD")
          : "",
        certificateNumber: training?.certificateNumber ?? "",
        isFC: training?.isFC ?? false,
      });
      setFile(null);
      setRemoveExistingFile(false);
    }
  }

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        let fileKey: string | null | undefined = training?.fileKey;

        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadExternalTrainingFile(formData);
          fileKey = result.key;
        } else if (removeExistingFile) {
          fileKey = null;
        }

        const finalName = data.name || data.type;

        if (isEditing) {
          await updateExternalTraining(training.id, {
            type: data.type,
            name: finalName,
            organisme: data.organisme,
            obtainedAt: new Date(data.obtainedAt),
            certificateNumber: data.certificateNumber || undefined,
            isFC: data.isFC,
            fileKey,
          });
          toast.success("Formation externe mise à jour");
        } else {
          await createExternalTraining({
            traineeId,
            type: data.type,
            name: finalName,
            organisme: data.organisme,
            obtainedAt: new Date(data.obtainedAt),
            certificateNumber: data.certificateNumber || undefined,
            isFC: data.isFC,
            fileKey: fileKey || undefined,
          });
          toast.success("Formation externe ajoutée");
        }

        setOpen(false);
        form.reset();
        setFile(null);
        setRemoveExistingFile(false);
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Une erreur est survenue";
        toast.error(message);
      }
    });
  }

  const defaultTrigger = isEditing ? (
    <Button variant="ghost" size="icon" className="h-7 w-7">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button size="sm" variant="outline">
      <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une formation externe
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Modifier la formation externe"
              : "Ajouter une formation externe"}
          </DialogTitle>
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
                <FormItem className="flex flex-col rounded-lg border p-3">
                  <div className="flex flex-row items-center justify-between">
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
                        disabled={
                          !selectedType || (!hasInitialTraining && !field.value)
                        }
                      />
                    </FormControl>
                  </div>
                  {selectedType && !hasInitialTraining && (
                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
                      ⚠️ Option réservée aux filières avec formation initiale
                      enregistrée.{" "}
                      {field.value
                        ? "Décocher pour corriger l'anomalie."
                        : "Option désactivée."}
                    </p>
                  )}
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
              {training?.fileKey && !removeExistingFile && !file && (
                <div className="mb-2 flex items-center justify-between rounded-md border p-2 text-sm">
                  <span className="text-muted-foreground flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4" /> Justificatif actuel
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 text-xs"
                    onClick={() => setRemoveExistingFile(true)}
                  >
                    Supprimer le fichier
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="border-input hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {file ? file.name : "Choisir un nouveau fichier"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setRemoveExistingFile(false);
                    }}
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
                  setRemoveExistingFile(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Enregistrement..."
                  : isEditing
                    ? "Enregistrer"
                    : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
