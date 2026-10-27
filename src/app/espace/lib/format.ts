import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/fr";

dayjs.extend(utc);

// Dates @db.Date stockées à minuit UTC : lues en UTC pour éviter un décalage d'un jour

// dayjs ne sait pas formater un intervalle : Intl.formatRange donne « 12–16 novembre 2026 »
const rangeFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatSessionDates(
  startDate: Date | null,
  endDate: Date | null
) {
  if (!startDate) return "Dates à venir";
  if (!endDate) return dayjs.utc(startDate).locale("fr").format("D MMMM YYYY");
  return rangeFormat.formatRange(startDate, endDate);
}

/** « ven. 23 oct. » */
export function formatSlotDay(date: Date) {
  return dayjs.utc(date).locale("fr").format("ddd D MMM");
}

/** « 09:00 » → « 9h00 » */
export function formatTimeLabel(time: string) {
  return dayjs(`2000-01-01T${time}`).format("H[h]mm");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

const parisDayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/** « 20 novembre », jour calendaire à Paris (instant, pas une @db.Date) */
export function formatParisDay(date: Date) {
  return parisDayFormat.format(date);
}

/** « 0644046022 » → « 06 44 04 60 22 » ; format inconnu : tel quel */
export function formatPhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  const pairs = (rest: string) => rest.match(/\d{2}/g)?.join(" ") ?? rest;
  if (/^0\d{9}$/.test(digits)) return pairs(digits);
  if (/^\+33\d{9}$/.test(digits)) {
    return `+33 ${digits[3]} ${pairs(digits.slice(4))}`;
  }
  return phone;
}
