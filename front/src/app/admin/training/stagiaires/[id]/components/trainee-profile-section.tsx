"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  Pencil,
  X,
  Save,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateTrainee } from "../../../actions";
import { TraineeWithHistory } from "../../../types";
import Link from "next/link";

const schema = z.object({
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide").or(z.literal("")),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trainee: TraineeWithHistory;
}

export function TraineeProfileSection({ trainee }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalFormations =
    trainee.inscriptions.length + trainee.externalTrainings.length;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: trainee.firstName,
      lastName: trainee.lastName,
      email: trainee.email || "",
      phone: trainee.phone || "",
      dateOfBirth: trainee.dateOfBirth
        ? dayjs(trainee.dateOfBirth).format("YYYY-MM-DD")
        : "",
      address: trainee.address || "",
    },
  });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      try {
        await updateTrainee(trainee.id, {
          ...data,
          email: data.email === "" ? undefined : data.email,
          dateOfBirth: data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : undefined,
        });
        toast.success("Stagiaire mis à jour");
        setEditing(false);
        router.refresh();
      } catch {
        toast.error("Une erreur est survenue");
      }
    });
  }

  return (
    <div className="px-6 py-4">
      {/* Breadcrumb + header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/training/stagiaires">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <User className="text-muted-foreground h-5 w-5" />
            <h1 className="text-xl font-bold">
              {trainee.lastName.toUpperCase()} {trainee.firstName}
            </h1>
            <Badge variant="secondary">
              {totalFormations} formation{totalFormations > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-3 w-3" /> Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                form.reset();
              }}
            >
              <X className="mr-2 h-3 w-3" /> Annuler
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending}
            >
              <Save className="mr-2 h-3 w-3" /> Enregistrer
            </Button>
          </div>
        )}
      </div>

      {/* Infos / formulaire */}
      {!editing ? (
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <div className="text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            <span>{trainee.email || "—"}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" />
            <span>{trainee.phone || "—"}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {trainee.dateOfBirth
                ? dayjs(trainee.dateOfBirth).format("DD/MM/YYYY")
                : "—"}
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{trainee.address || "—"}</span>
          </div>
        </div>
      ) : (
        <Form {...form}>
          <form className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
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
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                <FormItem className="col-span-2 sm:col-span-3">
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      )}
    </div>
  );
}
