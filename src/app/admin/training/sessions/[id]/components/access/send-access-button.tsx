"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendAccessLinks } from "@/app/admin/training/actions";
import type { Inscription } from "@/app/admin/training/types";

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

export function SendAccessButton({
  sessionId,
  inscriptions,
}: {
  sessionId: string;
  inscriptions: Inscription[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);

  const withEmail = inscriptions.filter((i) => i.trainee?.email);
  const pendingCount = withEmail.filter(
    (i) => !(i.hasAccessLink && i.accessSentAt)
  ).length;

  function send(scope: "pending" | "all") {
    startTransition(async () => {
      try {
        const { sent, missingEmail, failed } = await sendAccessLinks(
          sessionId,
          scope
        );
        const parts = [plural(sent, "envoyé")];
        if (missingEmail) parts.push(`${missingEmail} sans email`);
        if (failed) parts.push(plural(failed, "échec"));
        const message = `Accès : ${parts.join(" · ")}`;
        if (failed) toast.warning(message);
        else toast.success(message);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Envoi impossible");
      }
    });
  }

  if (withEmail.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={pending}>
            {pending ? (
              <RefreshCw
                className="h-4 w-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Envoyer les accès
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => send("pending")}
            disabled={pendingCount === 0}
          >
            À ceux qui ne l&apos;ont pas reçu ({pendingCount})
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setConfirmAllOpen(true)}>
            Renvoyer à tous ({withEmail.length})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Renvoyer un lien à {plural(withEmail.length, "stagiaire")} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Chacun reçoit un nouveau lien par email. Les liens envoyés
              précédemment ne fonctionneront plus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => send("all")}>
              Renvoyer à tous
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
