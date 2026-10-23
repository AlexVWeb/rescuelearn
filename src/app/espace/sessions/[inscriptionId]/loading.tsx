import { Skeleton } from "@/components/ui/skeleton";

// Dimensions calquées sur la page pour éviter tout décalage au chargement
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement de votre formation">
      <div className="bg-background border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
