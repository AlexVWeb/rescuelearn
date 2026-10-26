// Progression du questionnaire : texte « Étape 2 sur 5 » en plus de la barre,
// l'information ne repose pas sur la seule couleur.

export function StepProgress({
  current,
  total,
  title,
}: {
  /** 1 à total */
  current: number;
  total: number;
  title: string;
}) {
  const percent = Math.round((current / total) * 100);
  const text = `Étape ${current} sur ${total} : ${title}`;

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-sm" aria-hidden="true">
        Étape {current} sur {total}
      </p>
      <div
        role="progressbar"
        aria-label="Progression du questionnaire"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={text}
        className="bg-muted h-2 overflow-hidden rounded-full border"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
