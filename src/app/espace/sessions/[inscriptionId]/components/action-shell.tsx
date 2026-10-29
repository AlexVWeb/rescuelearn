import { cn } from "@/lib/utils";

/** Bouton principal sur le fond inversé de la carte d'action */
export const ACTION_BUTTON_CLASS =
  "bg-brand-foreground text-brand hover:bg-brand-foreground/90 h-12 w-full text-base sm:w-auto sm:px-6";

/**
 * Carte de l'action du moment, seule en couleur inversée sur la page : le
 * stagiaire voit d'abord ce qu'il a à faire.
 */
export function ActionShell({
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="action-title"
      className={cn(
        "bg-brand text-brand-foreground shadow-brand/30 space-y-5 rounded-2xl p-5 shadow-xl sm:p-6",
        className
      )}
    >
      <div>
        <p className="text-brand-foreground/80 text-xs font-semibold tracking-wider uppercase">
          {eyebrow}
        </p>
        <h2
          id="action-title"
          className="mt-1 text-xl leading-tight font-bold tracking-tight first-letter:uppercase sm:text-2xl"
        >
          {title}
        </h2>
        {description && (
          <p className="text-brand-foreground/85 mt-1 text-sm first-letter:uppercase sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
