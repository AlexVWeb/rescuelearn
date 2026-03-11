"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SessionForm, SessionFormValues } from "./session-form";

interface SessionDialogProps {
  session?: SessionFormValues & {
    id: string;
    startDate?: Date | null;
    endDate?: Date | null;
  };
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (sessionId: string) => void;
}

export function SessionDialog({
  session,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: SessionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const handleSuccess = (id?: string) => {
    setOpen(false);
    if (onSuccess && id) {
      onSuccess(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {session ? "Modifier la session" : "Nouvelle Session"}
          </DialogTitle>
          {!session && (
            <DialogDescription>
              Créez une nouvelle session de formation pour votre organisme.
            </DialogDescription>
          )}
        </DialogHeader>
        <SessionForm
          sessionItem={session}
          onCancel={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
