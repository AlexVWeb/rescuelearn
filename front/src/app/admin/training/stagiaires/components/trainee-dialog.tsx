"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createTrainee, updateTrainee } from "../../actions";

const traineeSchema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide").or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
});

type TraineeFormValues = z.infer<typeof traineeSchema>;

interface TraineeDialogProps {
  trainee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth?: Date | null;
    address?: string | null;
  };
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (traineeId: string) => void;
}

export function TraineeDialog({
  trainee,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: TraineeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const form = useForm<TraineeFormValues>({
    resolver: zodResolver(traineeSchema),
    defaultValues: {
      firstName: trainee?.firstName || "",
      lastName: trainee?.lastName || "",
      email: trainee?.email || "",
      phone: trainee?.phone || "",
      dateOfBirth: trainee?.dateOfBirth
        ? dayjs(trainee.dateOfBirth).format("YYYY-MM-DD")
        : "",
      address: trainee?.address || "",
    },
  });

  async function onSubmit(data: TraineeFormValues) {
    try {
      const formattedData = {
        ...data,
        email: data.email === "" ? undefined : data.email,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      };

      if (trainee) {
        await updateTrainee(trainee.id, formattedData);
        toast.success("Stagiaire mis à jour");
      } else {
        const result = await createTrainee(formattedData);
        toast.success("Stagiaire créé");
        if (onSuccess) onSuccess(result.id);
      }
      setOpen(false);
      if (!trainee) form.reset();
      router.refresh();
    } catch (error) {
      console.error("Failed to save trainee", error);
      toast.error("Une erreur est survenue");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {trainee ? "Modifier le stagiaire" : "Nouveau Stagiaire"}
          </DialogTitle>
          {!trainee && (
            <DialogDescription>
              Ajoutez un nouveau stagiaire à votre base de données.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input placeholder="Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="jean.dupont@exemple.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 rue de la Paix, 75000 Paris"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="06 12 34 56 78" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {trainee ? "Enregistrer" : "Créer le stagiaire"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
