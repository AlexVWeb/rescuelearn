// Dates @db.Date stockées à minuit UTC : formatées en UTC pour éviter un décalage d'un jour

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const slotDayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatSessionDates(
  startDate: Date | null,
  endDate: Date | null
) {
  if (!startDate) return "Dates à venir";
  if (!endDate) return dateFormat.format(startDate);
  return dateFormat.formatRange(startDate, endDate);
}

/** « mar. 12 nov. » */
export function formatSlotDay(date: Date) {
  return slotDayFormat.format(date);
}

/** « 09:00 » → « 9h00 » */
export function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(":");
  return `${Number(hours)}h${minutes}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
