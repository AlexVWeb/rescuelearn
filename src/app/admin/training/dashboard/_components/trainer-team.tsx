import { SectionHeading } from "./section-heading";

interface TrainerData {
  id: string;
  name: string;
  sessionsCount: number;
  role: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function TrainerTeam({
  trainers,
  teamSize,
}: {
  /** Les membres les plus actifs, déjà triés */
  trainers: TrainerData[];
  teamSize: number;
}) {
  const others = teamSize - trainers.length;

  return (
    <section aria-labelledby="team-title">
      <SectionHeading
        id="team-title"
        title={`Équipe (${teamSize})`}
        action={{ href: "/admin/users", label: "Gérer l'équipe" }}
      />

      <ul className="bg-card divide-y rounded-2xl border">
        {trainers.map((trainer) => (
          <li key={trainer.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              aria-hidden="true"
            >
              {initials(trainer.name) || "?"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground block truncate text-sm font-medium">
                {trainer.name}
              </span>
              <span className="text-muted-foreground block text-xs">
                {trainer.role}
              </span>
            </span>
            <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
              {trainer.sessionsCount} session
              {trainer.sessionsCount > 1 ? "s" : ""}
            </span>
          </li>
        ))}
        {others > 0 && (
          <li className="text-muted-foreground px-4 py-2.5 text-sm">
            et {others} autre{others > 1 ? "s" : ""} membre
            {others > 1 ? "s" : ""}
          </li>
        )}
      </ul>
    </section>
  );
}
