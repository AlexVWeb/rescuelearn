import Link from "next/link";

/** Titre de bloc du tableau de bord, avec un lien secondaire facultatif. */
export function SectionHeading({
  id,
  title,
  action,
}: {
  id: string;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-foreground text-base font-semibold">
        {title}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
