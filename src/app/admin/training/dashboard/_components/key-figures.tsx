interface KeyFiguresProps {
  stats: {
    sessions: { total: number; increase: number };
    trainees: { total: number; increase: number };
    successRate: { percentage: number | null };
    presence: { percentage: number | null };
  };
}

const percent = (value: number) => `${value} %`;

/** Chiffres de l'activité, en retrait : ils informent, l'agenda guide. */
export function KeyFigures({ stats }: KeyFiguresProps) {
  const figures = [
    {
      label: "Sessions à venir",
      value: String(stats.sessions.total),
      hint:
        stats.sessions.increase > 0
          ? `dont ${stats.sessions.increase} ce mois-ci`
          : "aucune ce mois-ci",
    },
    {
      label: "Stagiaires formés",
      value: String(stats.trainees.total),
      hint: `${stats.trainees.increase} ce mois-ci`,
    },
    {
      label: "Taux de réussite",
      value:
        stats.successRate.percentage === null
          ? "–"
          : percent(stats.successRate.percentage),
      hint:
        stats.successRate.percentage === null
          ? "après la première session clôturée"
          : "sur les sessions clôturées",
    },
    {
      label: "Présence",
      value:
        stats.presence.percentage === null
          ? "–"
          : percent(stats.presence.percentage),
      hint:
        stats.presence.percentage === null
          ? "aucun émargement en 30 jours"
          : "sur les 30 derniers jours",
    },
  ];

  return (
    <section aria-labelledby="figures-title">
      <h2 id="figures-title" className="sr-only">
        Chiffres clés
      </h2>
      <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="bg-card p-4 sm:p-5">
            <dt className="text-muted-foreground text-sm">{figure.label}</dt>
            <dd className="text-foreground mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {figure.value}
            </dd>
            <dd className="text-muted-foreground mt-0.5 text-xs">
              {figure.hint}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
