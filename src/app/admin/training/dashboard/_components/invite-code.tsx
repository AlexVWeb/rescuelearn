import { CopyButton } from "@/components/copy-button";

/** Code à transmettre aux formateurs pour rejoindre l'organisme. */
export function InviteCode({ code }: { code: string }) {
  return (
    <div
      className="bg-card flex h-9 items-center gap-2 rounded-md border pr-0.5 pl-3"
      title="Transmettez ce code aux formateurs : ils rejoignent votre organisme à l'inscription."
    >
      <span className="text-muted-foreground text-sm">Code formateurs</span>
      <code className="text-foreground max-w-[9rem] truncate font-mono text-sm font-semibold">
        {code}
      </code>
      <CopyButton value={code} />
    </div>
  );
}
