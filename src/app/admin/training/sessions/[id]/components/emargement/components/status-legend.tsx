export function StatusLegend() {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <div className="flex gap-4">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-green-600" />
          <span>Présent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-destructive h-3 w-3 rounded-full" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-secondary h-3 w-3 rounded-full" />
          <span>En attente</span>
        </div>
      </div>
    </div>
  );
}
