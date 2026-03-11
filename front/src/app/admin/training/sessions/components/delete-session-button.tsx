"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteTrainingSession } from "../../actions";

interface DeleteSessionButtonProps {
  sessionId: string;
}

export function DeleteSessionButton({ sessionId }: DeleteSessionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette session et tout son historique ?")) {
      startTransition(async () => {
        try {
          await deleteTrainingSession(sessionId);
          router.refresh();
        } catch (error) {
          console.error("Failed to delete session", error);
        }
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
