"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Slot } from "../../../../../types";

interface PinDialogProps {
  pin: string;
  slot: Slot;
}

export function PinDialog({ pin, slot }: PinDialogProps) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    setQrUrl(`${window.location.origin}/validation?pin=${pin}`);
  }, [pin]);

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
            <p className="font-medium">
              {qrUrl ? qrUrl.replace(`?pin=${pin}`, "") : "Chargement..."}
            </p>
          </div>

          <div className="border-primary/10 flex h-48 w-48 items-center justify-center rounded-xl border-8 bg-white p-2">
            {qrUrl ? (
              <QRCodeSVG value={qrUrl} size={144} level="M" />
            ) : (
              <div className="h-36 w-36 animate-pulse rounded bg-slate-100" />
            )}
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
