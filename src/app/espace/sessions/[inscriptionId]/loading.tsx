import { Skeleton } from "@/components/ui/skeleton";

// Dimensions calquées sur la page pour éviter tout décalage au chargement
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Chargement de votre formation">
      <div className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Skeleton className="h-12 w-12" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-6 px-4 pt-4 pb-12 sm:space-y-8 sm:px-6 sm:pt-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
          <div className="space-y-6 lg:space-y-8">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="space-y-6 lg:space-y-8">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
