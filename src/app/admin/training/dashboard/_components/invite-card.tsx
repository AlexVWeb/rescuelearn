import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Target } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

interface InviteCardProps {
  organisme: {
    name: string;
    inviteCode: string;
  } | null;
}

export function InviteCard({ organisme }: InviteCardProps) {
  if (!organisme) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase">
          <Target className="text-primary h-4 w-4" />
          Code d'invitation
        </CardTitle>
        <CardDescription className="text-xs">{organisme.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-2.5 font-mono text-sm font-bold dark:bg-slate-900/50">
          <span>{organisme.inviteCode}</span>
          <CopyButton value={organisme.inviteCode} />
        </div>
        <p className="text-[11px] leading-normal text-slate-500">
          Partagez ce code aux formateurs pour les rattacher automatiquement à
          votre organisme de formation.
        </p>
      </CardContent>
    </Card>
  );
}
