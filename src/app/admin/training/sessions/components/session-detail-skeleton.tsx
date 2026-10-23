import { Skeleton } from "@/components/ui/skeleton";

// Même gabarit que la page (header, étapes, contenu) pour éviter tout saut
export function SessionDetailSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Chargement de la session"
    >
      <div className="space-y-3">
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="min-h-[400px] space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
