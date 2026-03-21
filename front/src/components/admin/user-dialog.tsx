"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  updateUserAction,
  createUserAction,
} from "@/app/actions/user-actions";
import { UserRole, userRoleSchema } from "@/lib/roles";
import { useRouter } from "next/navigation";

// Schema
const userSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.email("L'adresse e-mail n'est pas valide"),
    role: userRoleSchema.default(UserRole.FORMATEUR),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.password && !data.confirmPassword) return; // edit mode, skip
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Le mot de passe doit faire au moins 8 caractères",
      });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
      });
    }
  });

type UserFormValues = z.infer<typeof userSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null; // If present, we are editing
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      role: UserRole.FORMATEUR,
    },
  });

  useEffect(() => {
    if (user) {
      // Create a safely typed role string
      const roleValue =
        Array.isArray(user.roles) && user.roles.length > 0
          ? (user.roles[0] as UserRole)
          : UserRole.FORMATEUR;

      form.reset({
        name: user.name || "",
        email: user.email,
        role: roleValue,
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: UserRole.FORMATEUR,
      });
    }
  }, [user, form, open]);

  const onSubmit = async (data: UserFormValues) => {
    setLoading(true);
    setError("");

    try {
      let result;
      const roles = [data.role]; // Simple string to array

      if (user) {
        // Update
        result = await updateUserAction(user.id, { name: data.name, roles });
      } else {
        // Create
        result = await createUserAction({
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password!,
        });
      }

      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error || "Something went wrong");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Make changes to the user profile here."
              : "Add a new user to the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input
                      placeholder="john@example.com"
                      {...field}
                      disabled={!!user}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={UserRole.FORMATEUR}>
                        Formateur
                      </SelectItem>
                      <SelectItem value={UserRole.ADMIN_ORGANISME}>
                        Admin Organisme
                      </SelectItem>
                      <SelectItem value={UserRole.SUPER_ADMIN}>
                        Super Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!user && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
