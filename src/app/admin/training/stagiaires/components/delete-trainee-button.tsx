"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { deleteTrainee } from "../../actions";

interface DeleteTraineeButtonProps {
  traineeId: string;
}

export function DeleteTraineeButton({ traineeId }: DeleteTraineeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce stagiaire ?")) {
      startTransition(async () => {
        try {
          await deleteTrainee(traineeId);
          router.refresh();
        } catch (error) {
          logger.error("Failed to delete trainee", error);
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
