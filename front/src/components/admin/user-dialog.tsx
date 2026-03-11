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
import { User, updateUserAction } from "@/app/actions/user-actions";
import { useRouter } from "next/navigation";

// Schema
const userSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.email("L'adresse e-mail n'est pas valide"),
  role: z.string().default("USER"),
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
      role: "USER",
    },
  });

  useEffect(() => {
    if (user) {
      // Create a safely typed role string
      let roleValue = "USER";
      // This logic depends on how roles are stored in JSON.
      // Assuming ["ADMIN"] or just "ADMIN"
      if (Array.isArray(user.roles) && user.roles.includes("ADMIN"))
        roleValue = "ADMIN";
      else if (user.roles === "ADMIN") roleValue = "ADMIN";

      form.reset({
        name: user.name || "",
        email: user.email,
        role: roleValue,
      });
    } else {
      form.reset({
        name: "",
        email: "",
        role: "USER",
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
        // Note: Password handling is missing here as agreed in plan (basic setup first)
        // Ideally we'd have a generated password or email invite flow.
        // For now simplified to just calling create action (which we need to make sure exists)
        // Check: I defined get, update, delete in user-actions. Did I define create?
        // I missed createUserAction in the previous write_to_file call!!
        // I only wrote get, delete, update.
        // I need to add createUserAction.
        // For now, I'll comment this out or assume it exists and fix it in the next step.
        console.warn("Create not implemented completely yet");
        result = { success: false, error: "Create not implemented yet" };
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
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
