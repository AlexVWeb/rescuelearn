import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutTrainee } from "../actions";

interface EspaceHeaderProps {
  organisme: { name: string; logo: string | null };
}

// Le mail vient de l'organisme : l'en-tête doit confirmer qui est derrière l'espace
export async function EspaceHeader({ organisme }: EspaceHeaderProps) {
  let logoUrl: string | null = null;
  if (organisme.logo) {
    const { getPresignedUrl } = await import("@/lib/r2");
    logoUrl = await getPresignedUrl(organisme.logo).catch(() => null);
  }

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              height={40}
              className="h-10 w-auto max-w-24 shrink-0 object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm leading-tight font-semibold sm:text-base">
              {organisme.name}
            </p>
            <p className="text-muted-foreground text-xs">avec RescueLearn</p>
          </div>
        </div>
        <form action={signOutTrainee}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:ml-2">
              Se déconnecter
            </span>
          </Button>
        </form>
      </div>
    </header>
  );
}
