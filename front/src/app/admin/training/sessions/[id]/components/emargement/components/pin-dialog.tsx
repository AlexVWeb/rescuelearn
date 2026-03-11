"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { Slot } from "../../../../../types";

interface PinDialogProps {
  pin: string;
  slot: Slot;
}

export function PinDialog({ pin, slot }: PinDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-dashed px-2 font-mono text-xs tracking-wider"
        >
          PIN: {pin}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Émargement Stagiaire
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6 py-4">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              Scannez le QR Code ou allez sur :
            </p>
            <p className="font-medium">{window.location.origin}/validation</p>
          </div>

          <div className="border-primary/10 flex h-48 w-48 items-center justify-center rounded-xl border-8 bg-white p-2">
            <div className="relative flex flex-col items-center gap-2">
              <QrCode className="text-primary h-32 w-32" />
              <span className="bg-primary absolute -bottom-2 rounded px-2 py-0.5 font-mono text-xl font-bold text-white shadow-lg">
                {pin}
              </span>
            </div>
          </div>

          <div className="bg-muted w-full rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-xs tracking-widest uppercase">
              Code de validation
            </p>
            <p className="text-primary font-mono text-4xl font-black tracking-[0.2em]">
              {pin}
            </p>
          </div>

          <p className="text-muted-foreground text-center text-xs">
            Ce code est valable pour le créneau :
            <br />
            <span className="font-bold">{slot.label}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
